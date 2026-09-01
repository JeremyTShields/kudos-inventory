import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, sequelize, resetDb, loginAs, ADMIN, createMaterial } from './helpers';

let token: string;
let materialId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  materialId = await createMaterial(token, 'MAT-PO');
});

describe('POST /purchase-orders', () => {
  it('creates an order with lines and returns it fully populated', async () => {
    const res = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Acme Supply',
        orderedAt: '2026-09-01',
        notes: 'restock',
        lines: [{ materialId, qty: 25.5 }]
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('OPEN');
    expect(res.body.PurchaseOrderLines).toHaveLength(1);
    expect(res.body.PurchaseOrderLines[0].Material.sku).toBe('MAT-PO');
    expect(parseFloat(res.body.PurchaseOrderLines[0].qty)).toBeCloseTo(25.5, 5);
  });

  it('rejects an order without lines with 400', async () => {
    const res = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ supplierName: 'Acme Supply', orderedAt: '2026-09-01', lines: [] });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown material and creates no partial order', async () => {
    const before = await sequelize.models.PurchaseOrder.count();
    const res = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Acme Supply',
        orderedAt: '2026-09-01',
        lines: [{ materialId: 999999, qty: 1 }]
      });
    expect(res.status).toBe(404);
    expect(await sequelize.models.PurchaseOrder.count()).toBe(before);
  });

  it('does not create purchase orders without inventory impact', async () => {
    // Purchase orders record intent; only receipts move stock
    const txns = await sequelize.models.InventoryTxn.count();
    expect(txns).toBe(0);
  });
});

describe('PUT /purchase-orders/:id/status', () => {
  it('moves an order through its status lifecycle', async () => {
    const created = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Lifecycle Co',
        orderedAt: '2026-09-01',
        lines: [{ materialId, qty: 5 }]
      });
    const orderId = created.body.id;

    const received = await request(app)
      .put(`/purchase-orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'RECEIVED' });
    expect(received.status).toBe(200);
    expect(received.body.status).toBe('RECEIVED');
  });

  it('rejects an invalid status with 400', async () => {
    const created = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Bad Status Co',
        orderedAt: '2026-09-01',
        lines: [{ materialId, qty: 5 }]
      });

    const res = await request(app)
      .put(`/purchase-orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'SHIPPED' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /purchase-orders/:id', () => {
  it('deletes the order and its lines', async () => {
    const created = await request(app)
      .post('/purchase-orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierName: 'Delete Me',
        orderedAt: '2026-09-01',
        lines: [{ materialId, qty: 2 }]
      });
    const orderId = created.body.id;

    const del = await request(app)
      .delete(`/purchase-orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const lines = await sequelize.models.PurchaseOrderLine.count({ where: { purchaseOrderId: orderId } });
    expect(lines).toBe(0);
  });
});

describe('audit trail', () => {
  it('records purchase order actions', async () => {
    const res = await request(app)
      .get('/audit/logs?entityType=PURCHASE_ORDER')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const actions = res.body.map((log: any) => log.action);
    expect(actions).toContain('CREATE');
    expect(actions).toContain('UPDATE');
    expect(actions).toContain('DELETE');
  });
});
