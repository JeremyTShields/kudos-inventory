import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN, createProduct } from './helpers';

let token: string;
let productId: number;
let stationId: number;
let assembleId: number;
let paintId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  productId = await createProduct(token, 'PROD-RT');

  const station = await request(app)
    .post('/workstations')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: 'WS-RT', name: 'Routing Station' });
  stationId = station.body.id;

  const assemble = await request(app)
    .post('/operations')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: 'OP-RT-ASSY', name: 'Assemble', workStationId: stationId });
  assembleId = assemble.body.id;

  const paint = await request(app)
    .post('/operations')
    .set('Authorization', `Bearer ${token}`)
    .send({ code: 'OP-RT-PAINT', name: 'Paint' });
  paintId = paint.body.id;
});

describe('POST /routing', () => {
  it('adds sequenced steps linked to operations and their stations', async () => {
    const first = await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, operationId: assembleId, sequence: 1 });
    expect(first.status).toBe(201);
    expect(first.body.Operation.code).toBe('OP-RT-ASSY');
    expect(first.body.Operation.WorkStation.code).toBe('WS-RT');

    const second = await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, operationId: paintId, sequence: 2 });
    expect(second.status).toBe(201);
    expect(second.body.Operation.WorkStation).toBeNull();
  });

  it('rejects an unknown product or operation with 404', async () => {
    const badProduct = await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 999999, operationId: assembleId, sequence: 1 });
    expect(badProduct.status).toBe(404);

    const badOperation = await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, operationId: 999999, sequence: 1 });
    expect(badOperation.status).toBe(404);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId });
    expect(res.status).toBe(400);
  });
});

describe('GET /routing/product/:productId', () => {
  it('returns steps ordered by sequence', async () => {
    // Add a step out of order to prove ordering comes from sequence
    const inspect = await request(app)
      .post('/operations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'OP-RT-INSP', name: 'Inspect' });
    await request(app)
      .post('/routing')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, operationId: inspect.body.id, sequence: 0 });

    const res = await request(app)
      .get(`/routing/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const sequences = res.body.map((step: any) => step.sequence);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
    expect(res.body[0].Operation.code).toBe('OP-RT-INSP');
  });
});

describe('PUT and DELETE /routing/:id', () => {
  it('updates a step sequence', async () => {
    const routing = await request(app)
      .get(`/routing/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    const step = routing.body[0];

    const res = await request(app)
      .put(`/routing/${step.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ sequence: 99 });
    expect(res.status).toBe(200);
    expect(res.body.sequence).toBe(99);
  });

  it('deletes a step', async () => {
    const routing = await request(app)
      .get(`/routing/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    const countBefore = routing.body.length;
    const step = routing.body[0];

    const del = await request(app)
      .delete(`/routing/${step.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get(`/routing/product/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.length).toBe(countBefore - 1);
  });

  it('returns 404 for an unknown step', async () => {
    const res = await request(app)
      .put('/routing/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ sequence: 1 });
    expect(res.status).toBe(404);
  });
});

describe('audit trail', () => {
  it('records routing changes against the product', async () => {
    const res = await request(app)
      .get('/audit/logs?entityType=PRODUCT')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const routingLogs = res.body.filter((log: any) => log.description.includes('routing'));
    expect(routingLogs.length).toBeGreaterThan(0);
  });
});
