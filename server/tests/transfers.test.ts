import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app, sequelize, resetDb, loginAs, ADMIN, createLocation, createMaterial } from './helpers';

let token: string;
let mainId: number;
let dockId: number;
let materialId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  mainId = await createLocation(token, 'MAIN');
  dockId = await createLocation(token, 'DOCK');
  materialId = await createMaterial(token, 'MAT-TR');

  // Stock 100 at MAIN to transfer from
  await request(app).post('/receipts').set('Authorization', `Bearer ${token}`).send({
    supplierName: 'Seed', receivedAt: '2026-09-01',
    lines: [{ materialId, qty: 100, locationId: mainId }]
  });
});

async function stockAt(locationId: number): Promise<number> {
  const res = await request(app).get('/inventory/stock').set('Authorization', `Bearer ${token}`);
  const row = res.body.find((s: any) =>
    s.itemType === 'MATERIAL' && Number(s.itemId) === materialId && Number(s.locationId) === locationId);
  return row ? parseFloat(row.currentStock) : 0;
}

describe('POST /transfers', () => {
  it('moves stock between locations with a zero net change', async () => {
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-02',
        notes: 'rebalance',
        lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 30, fromLocationId: mainId, toLocationId: dockId }]
      });
    expect(res.status).toBe(201);
    expect(res.body.TransferLines).toHaveLength(1);
    expect(res.body.TransferLines[0].FromLocation.code).toBe('MAIN');
    expect(res.body.TransferLines[0].ToLocation.code).toBe('DOCK');

    expect(await stockAt(mainId)).toBeCloseTo(70, 5);
    expect(await stockAt(dockId)).toBeCloseTo(30, 5);

    // Paired transactions: one negative TRANSFER_OUT, one positive TRANSFER_IN
    const txns = await sequelize.models.InventoryTxn.findAll({
      where: { entityType: 'TRANSFER', entityId: res.body.id }
    });
    expect(txns).toHaveLength(2);
    const rows = txns.map(txn => txn.get() as any);
    const out = rows.find(r => r.txnType === 'TRANSFER_OUT');
    const inn = rows.find(r => r.txnType === 'TRANSFER_IN');
    expect(parseFloat(out.qty)).toBeCloseTo(-30, 5);
    expect(Number(out.locationId)).toBe(mainId);
    expect(parseFloat(inn.qty)).toBeCloseTo(30, 5);
    expect(Number(inn.locationId)).toBe(dockId);
  });

  it('rejects a transfer with identical source and destination', async () => {
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-02',
        lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 5, fromLocationId: mainId, toLocationId: mainId }]
      });
    expect(res.status).toBe(400);
  });

  it('rejects a zero or negative quantity', async () => {
    const res = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-02',
        lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: -5, fromLocationId: mainId, toLocationId: dockId }]
      });
    expect(res.status).toBe(400);
  });

  it('rejects an unknown item or location and creates nothing', async () => {
    const before = await sequelize.models.Transfer.count();

    const badItem = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-02',
        lines: [{ itemType: 'MATERIAL', itemId: 999999, qty: 5, fromLocationId: mainId, toLocationId: dockId }]
      });
    expect(badItem.status).toBe(404);

    const badLocation = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-02',
        lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 5, fromLocationId: mainId, toLocationId: 999999 }]
      });
    expect(badLocation.status).toBe(404);

    expect(await sequelize.models.Transfer.count()).toBe(before);
  });

  it('performs every insert inside the shared transaction', async () => {
    const transferSpy = vi.spyOn(sequelize.models.Transfer, 'create');
    const lineSpy = vi.spyOn(sequelize.models.TransferLine, 'create');
    const txnSpy = vi.spyOn(sequelize.models.InventoryTxn, 'create');
    try {
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transferredAt: '2026-09-03',
          lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 1, fromLocationId: mainId, toLocationId: dockId }]
        });
      expect(res.status).toBe(201);

      for (const spy of [transferSpy, lineSpy, txnSpy]) {
        expect(spy.mock.calls.length).toBeGreaterThan(0);
        for (const call of spy.mock.calls) {
          expect(call[1]?.transaction, 'all transfer inserts must share the transaction').toBeTruthy();
        }
      }
    } finally {
      transferSpy.mockRestore();
      lineSpy.mockRestore();
      txnSpy.mockRestore();
    }
  });

  it('rolls back everything when an insert fails mid-way', async () => {
    const transfersBefore = await sequelize.models.Transfer.count();
    const txnsBefore = await sequelize.models.InventoryTxn.count();

    const spy = vi.spyOn(sequelize.models.InventoryTxn, 'create').mockRejectedValueOnce(new Error('simulated failure'));
    try {
      const res = await request(app)
        .post('/transfers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          transferredAt: '2026-09-04',
          lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 2, fromLocationId: mainId, toLocationId: dockId }]
        });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    expect(await sequelize.models.Transfer.count()).toBe(transfersBefore);
    expect(await sequelize.models.InventoryTxn.count()).toBe(txnsBefore);
  });
});

describe('DELETE /transfers/:id', () => {
  it('preserves inventory transactions like shipments do', async () => {
    const created = await request(app)
      .post('/transfers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transferredAt: '2026-09-05',
        lines: [{ itemType: 'MATERIAL', itemId: materialId, qty: 3, fromLocationId: mainId, toLocationId: dockId }]
      });
    const transferId = created.body.id;

    const del = await request(app)
      .delete(`/transfers/${transferId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const txns = await sequelize.models.InventoryTxn.count({
      where: { entityType: 'TRANSFER', entityId: transferId }
    });
    expect(txns).toBe(2);
  });
});
