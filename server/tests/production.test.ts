import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import {
  app, sequelize, resetDb, loginAs, ADMIN,
  createLocation, createMaterial, createProduct, createBomItem
} from './helpers';

let token: string;
let locationId: number;
let productId: number;
let steelId: number;
let screwsId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  locationId = await createLocation(token, 'PROD');
  steelId = await createMaterial(token, 'MAT-STEEL');
  screwsId = await createMaterial(token, 'MAT-SCREWS');
  productId = await createProduct(token, 'PROD-WIDGET');
  await createBomItem(token, productId, steelId, 2.5);
  await createBomItem(token, productId, screwsId, 8);
});

describe('POST /production', () => {
  it('creates the run and the exact BOM consumption transactions', async () => {
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantityProduced: 10,
        locationId,
        startedAt: '2026-08-01',
        completedAt: '2026-08-02',
        notes: 'test run'
      });
    expect(res.status).toBe(201);
    const runId = res.body.id;
    expect(typeof runId).toBe('number');

    const txns = await sequelize.models.InventoryTxn.findAll({
      where: { entityType: 'PRODUCTION', entityId: runId }
    });
    const rows = txns.map(t => t.get() as any);

    // One consumption row per BOM item, negative qty = qtyPerUnit * quantityProduced
    const steelConsume = rows.find(r => r.txnType === 'MATERIAL_CONSUME' && Number(r.itemId) === steelId);
    const screwsConsume = rows.find(r => r.txnType === 'MATERIAL_CONSUME' && Number(r.itemId) === screwsId);
    expect(steelConsume).toBeDefined();
    expect(parseFloat(steelConsume.qty)).toBeCloseTo(-25, 5);
    expect(screwsConsume).toBeDefined();
    expect(parseFloat(screwsConsume.qty)).toBeCloseTo(-80, 5);

    // One PRODUCT_IN row for the produced quantity
    const productIn = rows.find(r => r.txnType === 'PRODUCT_IN');
    expect(productIn).toBeDefined();
    expect(Number(productIn.itemId)).toBe(productId);
    expect(parseFloat(productIn.qty)).toBeCloseTo(10, 5);

    expect(rows).toHaveLength(3);
  });

  it('rejects missing fields with 400 and creates nothing', async () => {
    const before = await sequelize.models.ProductionRun.count();
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, locationId });
    expect(res.status).toBe(400);
    expect(await sequelize.models.ProductionRun.count()).toBe(before);
  });

  it('rejects an unknown product with 404', async () => {
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: 999999,
        quantityProduced: 1,
        locationId,
        startedAt: '2026-08-01',
        completedAt: '2026-08-02'
      });
    expect(res.status).toBe(404);
  });

  it('records the work station the run was performed at', async () => {
    const station = await request(app)
      .post('/workstations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'WS-PROD', name: 'Production Bench' });
    expect(station.status).toBe(201);

    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantityProduced: 3,
        locationId,
        workStationId: station.body.id,
        startedAt: '2026-09-01',
        completedAt: '2026-09-02'
      });
    expect(res.status).toBe(201);
    expect(res.body.workStationId).toBe(station.body.id);
    expect(res.body.WorkStation.code).toBe('WS-PROD');

    // The runs listing carries the station too
    const list = await request(app)
      .get('/production')
      .set('Authorization', `Bearer ${token}`);
    const run = list.body.find((r: any) => r.id === res.body.id);
    expect(run.WorkStation.code).toBe('WS-PROD');
  });

  it('rejects an unknown work station with 404', async () => {
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantityProduced: 1,
        locationId,
        workStationId: 999999,
        startedAt: '2026-09-01',
        completedAt: '2026-09-02'
      });
    expect(res.status).toBe(404);
  });

  it('still creates runs without a work station', async () => {
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantityProduced: 1,
        locationId,
        startedAt: '2026-09-01',
        completedAt: '2026-09-02'
      });
    expect(res.status).toBe(201);
    expect(res.body.workStationId).toBeNull();
  });

  it('rejects an unknown location with 404', async () => {
    const res = await request(app)
      .post('/production')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantityProduced: 1,
        locationId: 999999,
        startedAt: '2026-08-01',
        completedAt: '2026-08-02'
      });
    expect(res.status).toBe(404);
  });

  it('performs every insert inside the shared transaction', async () => {
    // In-memory SQLite serializes on one connection, which would hide an
    // insert that escapes the transaction; assert the handle is passed
    // explicitly so the guarantee also holds on MySQL.
    const runSpy = vi.spyOn(sequelize.models.ProductionRun, 'create');
    const txnSpy = vi.spyOn(sequelize.models.InventoryTxn, 'create');
    try {
      const res = await request(app)
        .post('/production')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId,
          quantityProduced: 2,
          locationId,
          startedAt: '2026-08-05',
          completedAt: '2026-08-06'
        });
      expect(res.status).toBe(201);

      expect(runSpy).toHaveBeenCalled();
      for (const call of runSpy.mock.calls) {
        expect(call[1]?.transaction, 'ProductionRun.create must run inside the transaction').toBeTruthy();
      }
      expect(txnSpy.mock.calls.length).toBeGreaterThan(0);
      for (const call of txnSpy.mock.calls) {
        expect(call[1]?.transaction, 'InventoryTxn.create must run inside the transaction').toBeTruthy();
      }
    } finally {
      runSpy.mockRestore();
      txnSpy.mockRestore();
    }
  });

  it('rolls back the run when a transaction insert fails mid-way', async () => {
    const runsBefore = await sequelize.models.ProductionRun.count();
    const txnsBefore = await sequelize.models.InventoryTxn.count();

    const spy = vi.spyOn(sequelize.models.InventoryTxn, 'create').mockRejectedValueOnce(new Error('simulated failure'));
    try {
      const res = await request(app)
        .post('/production')
        .set('Authorization', `Bearer ${token}`)
        .send({
          productId,
          quantityProduced: 5,
          locationId,
          startedAt: '2026-08-03',
          completedAt: '2026-08-04'
        });
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    // Nothing may survive a partial failure: no orphan run, no partial txns
    expect(await sequelize.models.ProductionRun.count()).toBe(runsBefore);
    expect(await sequelize.models.InventoryTxn.count()).toBe(txnsBefore);
  });
});
