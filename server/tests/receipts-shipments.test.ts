import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import {
  app, sequelize, resetDb, loginAs, ADMIN,
  createLocation, createMaterial, createProduct
} from './helpers';

let token: string;
let locationId: number;
let materialId: number;
let productId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  locationId = await createLocation(token, 'MAIN');
  materialId = await createMaterial(token, 'MAT-A');
  productId = await createProduct(token, 'PROD-A');
});

describe('POST /receipts', () => {
  it('creates positive MATERIAL_IN transactions for each line', async () => {
    const res = await request(app)
      .post('/receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Supplier Co',
        receivedAt: '2026-05-01',
        lines: [{ materialId, qty: 12.5, locationId }]
      });
    expect(res.status).toBe(201);
    expect(res.body.ReceiptLines).toHaveLength(1);
    expect(res.body.ReceiptLines[0].Material.sku).toBe('MAT-A');

    const txns = await sequelize.models.InventoryTxn.findAll({
      where: { entityType: 'RECEIPT', entityId: res.body.id }
    });
    expect(txns).toHaveLength(1);
    const txn = txns[0].get() as any;
    expect(txn.txnType).toBe('MATERIAL_IN');
    expect(parseFloat(txn.qty)).toBeCloseTo(12.5, 5);
  });

  it('rejects a receipt without lines with 400', async () => {
    const res = await request(app)
      .post('/receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierName: 'Supplier Co', receivedAt: '2026-05-01', lines: [] });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown material and creates no partial receipt', async () => {
    const receiptsBefore = await sequelize.models.Receipt.count();
    const res = await request(app)
      .post('/receipts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Supplier Co',
        receivedAt: '2026-05-01',
        lines: [{ materialId: 999999, qty: 1, locationId }]
      });
    expect(res.status).toBe(404);
    expect(await sequelize.models.Receipt.count()).toBe(receiptsBefore);
  });
});

describe('POST /shipments', () => {
  it('creates negative PRODUCT_OUT transactions for each line', async () => {
    const res = await request(app)
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Customer Co',
        shippedAt: '2026-05-02',
        lines: [{ productId, qty: 3, locationId }]
      });
    expect(res.status).toBe(201);
    expect(res.body.ShipmentLines).toHaveLength(1);
    expect(res.body.ShipmentLines[0].Product.sku).toBe('PROD-A');

    const txns = await sequelize.models.InventoryTxn.findAll({
      where: { entityType: 'SHIPMENT', entityId: res.body.id }
    });
    expect(txns).toHaveLength(1);
    const txn = txns[0].get() as any;
    expect(txn.txnType).toBe('PRODUCT_OUT');
    expect(parseFloat(txn.qty)).toBeCloseTo(-3, 5);
  });

  it('rejects a shipment without lines with 400', async () => {
    const res = await request(app)
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerName: 'Customer Co', shippedAt: '2026-05-02', lines: [] });
    expect(res.status).toBe(400);
  });

  it('deleting a shipment preserves its inventory transactions', async () => {
    const created = await request(app)
      .post('/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Delete Me',
        shippedAt: '2026-05-03',
        lines: [{ productId, qty: 1, locationId }]
      });
    const shipmentId = created.body.id;

    const del = await request(app)
      .delete(`/shipments/${shipmentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const txns = await sequelize.models.InventoryTxn.count({
      where: { entityType: 'SHIPMENT', entityId: shipmentId }
    });
    expect(txns).toBe(1);
  });
});
