import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import {
  app, resetDb, loginAs, ADMIN,
  createLocation, createMaterial, createProduct, createBomItem
} from './helpers';

let token: string;
let mainId: number;
let dockId: number;
let steelId: number;
let productId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  mainId = await createLocation(token, 'MAIN');
  dockId = await createLocation(token, 'DOCK');
  steelId = await createMaterial(token, 'MAT-STEEL', 50);
  productId = await createProduct(token, 'PROD-PANEL');
  await createBomItem(token, productId, steelId, 2);

  // Receive 100 steel at MAIN (2026-01-15) and 30 at DOCK (2026-06-15)
  await request(app).post('/receipts').set('Authorization', `Bearer ${token}`).send({
    supplierName: 'Acme', receivedAt: '2026-01-15',
    lines: [{ materialId: steelId, qty: 100, locationId: mainId }]
  });
  await request(app).post('/receipts').set('Authorization', `Bearer ${token}`).send({
    supplierName: 'Acme', receivedAt: '2026-06-15',
    lines: [{ materialId: steelId, qty: 30, locationId: dockId }]
  });

  // Produce 10 panels at MAIN: consumes 20 steel, adds 10 product
  await request(app).post('/production').set('Authorization', `Bearer ${token}`).send({
    productId, quantityProduced: 10, locationId: mainId,
    startedAt: '2026-07-01', completedAt: '2026-07-02'
  });

  // Ship 4 panels from MAIN
  await request(app).post('/shipments').set('Authorization', `Bearer ${token}`).send({
    customerName: 'Customer Inc', shippedAt: '2026-07-10',
    lines: [{ productId, qty: 4, locationId: mainId }]
  });
});

function stockFor(stock: any[], itemType: string, itemId: number, locationId: number) {
  const row = stock.find(s =>
    s.itemType === itemType && Number(s.itemId) === itemId && Number(s.locationId) === locationId);
  return row ? parseFloat(row.currentStock) : 0;
}

describe('GET /inventory/stock', () => {
  it('aggregates receipts, production, and shipments per item and location', async () => {
    const res = await request(app).get('/inventory/stock').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    // Steel: 100 in at MAIN - 20 consumed = 80; 30 at DOCK untouched
    expect(stockFor(res.body, 'MATERIAL', steelId, mainId)).toBeCloseTo(80, 5);
    expect(stockFor(res.body, 'MATERIAL', steelId, dockId)).toBeCloseTo(30, 5);

    // Product: 10 produced - 4 shipped = 6 at MAIN
    expect(stockFor(res.body, 'PRODUCT', productId, mainId)).toBeCloseTo(6, 5);
  });

  it('enriches rows with item and location details', async () => {
    const res = await request(app).get('/inventory/stock').set('Authorization', `Bearer ${token}`);
    const steelRow = res.body.find((s: any) => s.itemType === 'MATERIAL' && Number(s.itemId) === steelId && Number(s.locationId) === mainId);
    expect(steelRow.item.sku).toBe('MAT-STEEL');
    expect(steelRow.location.code).toBe('MAIN');
  });
});

describe('GET /inventory/stock/:itemType/:itemId', () => {
  it('returns the per-location breakdown and correct total', async () => {
    const res = await request(app)
      .get(`/inventory/stock/MATERIAL/${steelId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.totalStock).toBeCloseTo(110, 5);
    expect(res.body.stockByLocation).toHaveLength(2);
  });

  it('rejects an invalid item type with 400', async () => {
    const res = await request(app)
      .get('/inventory/stock/BANANA/1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /inventory/low-stock', () => {
  it('flags materials whose total stock is below minStock', async () => {
    // Steel total is 110 with minStock 50: not low. Create a material with
    // minStock 10 and no receipts: it must be flagged with deficit 10.
    const lowId = await createMaterial(token, 'MAT-LOW', 10);

    const res = await request(app).get('/inventory/low-stock').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const flagged = res.body.find((r: any) => r.material.id === lowId);
    expect(flagged).toBeDefined();
    expect(flagged.currentStock).toBeCloseTo(0, 5);
    expect(flagged.deficit).toBeCloseTo(10, 5);

    const steel = res.body.find((r: any) => r.material.id === steelId);
    expect(steel).toBeUndefined();
  });
});

describe('GET /inventory/transactions', () => {
  it('filters by date range', async () => {
    // Only the 2026-06-15 receipt txn falls in this window
    const res = await request(app)
      .get('/inventory/transactions?startDate=2026-03-01&endDate=2026-06-30')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].txnType).toBe('MATERIAL_IN');
    expect(parseFloat(res.body[0].qty)).toBeCloseTo(30, 5);
  });

  it('filters by item type', async () => {
    const res = await request(app)
      .get('/inventory/transactions?itemType=PRODUCT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const txn of res.body) {
      expect(txn.itemType).toBe('PRODUCT');
    }
  });
});

describe('POST /inventory/adjust', () => {
  it('creates a MANUAL adjustment transaction that moves stock', async () => {
    const res = await request(app)
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemType: 'MATERIAL', itemId: steelId, locationId: dockId, qty: -5, notes: 'damaged' });
    expect(res.status).toBe(201);
    expect(res.body.txnType).toBe('ADJUST');
    expect(res.body.entityType).toBe('MANUAL');
    expect(parseFloat(res.body.qty)).toBeCloseTo(-5, 5);

    const stock = await request(app).get('/inventory/stock').set('Authorization', `Bearer ${token}`);
    expect(stockFor(stock.body, 'MATERIAL', steelId, dockId)).toBeCloseTo(25, 5);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app)
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemType: 'MATERIAL', itemId: steelId });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown item with 404', async () => {
    const res = await request(app)
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemType: 'MATERIAL', itemId: 999999, locationId: dockId, qty: 1 });
    expect(res.status).toBe(404);
  });
});
