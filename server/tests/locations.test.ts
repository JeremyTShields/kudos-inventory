import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN, createLocation, createMaterial } from './helpers';

let token: string;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
});

describe('DELETE /locations/:id', () => {
  it('deletes a location with no inventory history', async () => {
    const locationId = await createLocation(token, 'TEMP');

    const del = await request(app)
      .delete(`/locations/${locationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get(`/locations/${locationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(404);
  });

  it('refuses to delete a location referenced by inventory transactions', async () => {
    const locationId = await createLocation(token, 'BUSY');
    const materialId = await createMaterial(token, 'MAT-LOC');

    // A receipt writes inventory transactions against the location
    await request(app).post('/receipts').set('Authorization', `Bearer ${token}`).send({
      supplierName: 'Acme',
      receivedAt: '2026-09-01',
      lines: [{ materialId, qty: 10, locationId }]
    });

    const del = await request(app)
      .delete(`/locations/${locationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toMatch(/inventory history/i);

    // The location must survive
    const after = await request(app)
      .get(`/locations/${locationId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(200);
    expect(after.body.code).toBe('BUSY');
  });

  it('returns 404 for an unknown location', async () => {
    const res = await request(app)
      .delete('/locations/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
