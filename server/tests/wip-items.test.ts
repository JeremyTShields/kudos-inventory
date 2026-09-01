import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN } from './helpers';

let token: string;
let itemId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
});

describe('WIP items', () => {
  it('creates a WIP item with tracking configuration', async () => {
    const res = await request(app)
      .post('/wip-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'WIP-01', name: 'Sub-Assembly', uom: 'UNIT', trackingType: 'LOT', lotPicking: 'FIFO' });
    expect(res.status).toBe(201);
    expect(res.body.trackingType).toBe('LOT');
    expect(res.body.lotPicking).toBe('FIFO');
    expect(res.body.active).toBeTruthy();
    itemId = res.body.id;
  });

  it('defaults tracking to NONE/FIFO', async () => {
    const res = await request(app)
      .post('/wip-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'WIP-02', name: 'Untracked Sub', uom: 'KG' });
    expect(res.status).toBe(201);
    expect(res.body.trackingType).toBe('NONE');
    expect(res.body.lotPicking).toBe('FIFO');
  });

  it('rejects a duplicate SKU with 409', async () => {
    const res = await request(app)
      .post('/wip-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'WIP-01', name: 'Duplicate', uom: 'UNIT' });
    expect(res.status).toBe(409);
  });

  it('rejects invalid tracking values with 400', async () => {
    const badTracking = await request(app)
      .post('/wip-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'WIP-03', name: 'Bad', uom: 'UNIT', trackingType: 'BARCODE' });
    expect(badTracking.status).toBe(400);

    const badPicking = await request(app)
      .post('/wip-items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'WIP-03', name: 'Bad', uom: 'UNIT', lotPicking: 'LIFO' });
    expect(badPicking.status).toBe(400);
  });

  it('updates and soft-deletes', async () => {
    const updated = await request(app)
      .put(`/wip-items/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Painted Sub-Assembly', serialPrefix: 'WSA-' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Painted Sub-Assembly');

    const deleted = await request(app)
      .delete(`/wip-items/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const after = await request(app)
      .get(`/wip-items/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.active).toBeFalsy();
  });

  it('records audit entries', async () => {
    const res = await request(app)
      .get('/audit/logs?entityType=WIP_ITEM')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const actions = res.body.map((log: any) => log.action);
    expect(actions).toContain('CREATE');
    expect(actions).toContain('UPDATE');
    expect(actions).toContain('DELETE');
  });
});
