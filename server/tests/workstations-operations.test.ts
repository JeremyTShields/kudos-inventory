import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN } from './helpers';

let token: string;
let stationId: number;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
});

describe('work stations', () => {
  it('creates a work station', async () => {
    const res = await request(app)
      .post('/workstations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'WS-01', name: 'Assembly 1', description: 'Main bench' });
    expect(res.status).toBe(201);
    expect(res.body.active).toBeTruthy();
    stationId = res.body.id;
  });

  it('rejects a duplicate code with 409', async () => {
    const res = await request(app)
      .post('/workstations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'WS-01', name: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app)
      .post('/workstations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'WS-02' });
    expect(res.status).toBe(400);
  });

  it('updates and soft-deletes', async () => {
    const updated = await request(app)
      .put(`/workstations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Assembly One' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Assembly One');

    const deleted = await request(app)
      .delete(`/workstations/${stationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);

    const after = await request(app)
      .get(`/workstations/${stationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.body.active).toBeFalsy();

    // Reactivate for the operation tests below
    await request(app)
      .put(`/workstations/${stationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ active: true });
  });
});

describe('operations', () => {
  it('creates an operation linked to a work station', async () => {
    const res = await request(app)
      .post('/operations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'OP-01', name: 'Assemble', workStationId: stationId });
    expect(res.status).toBe(201);
    expect(res.body.WorkStation.code).toBe('WS-01');
  });

  it('creates an operation without a work station', async () => {
    const res = await request(app)
      .post('/operations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'OP-02', name: 'Inspect' });
    expect(res.status).toBe(201);
    expect(res.body.workStationId).toBeNull();
  });

  it('rejects an unknown work station with 404', async () => {
    const res = await request(app)
      .post('/operations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'OP-03', name: 'Ghost', workStationId: 999999 });
    expect(res.status).toBe(404);
  });

  it('rejects a duplicate code with 409', async () => {
    const res = await request(app)
      .post('/operations')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'OP-01', name: 'Duplicate' });
    expect(res.status).toBe(409);
  });

  it('lists operations with their work stations', async () => {
    const res = await request(app)
      .get('/operations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    const linked = res.body.find((op: any) => op.code === 'OP-01');
    expect(linked.WorkStation.name).toBeDefined();
  });

  it('records audit entries for both entity types', async () => {
    const stations = await request(app)
      .get('/audit/logs?entityType=WORK_STATION')
      .set('Authorization', `Bearer ${token}`);
    expect(stations.body.length).toBeGreaterThan(0);

    const operations = await request(app)
      .get('/audit/logs?entityType=OPERATION')
      .set('Authorization', `Bearer ${token}`);
    expect(operations.body.length).toBeGreaterThan(0);
  });
});
