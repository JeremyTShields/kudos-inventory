import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN, ASSOCIATE, createLocation } from './helpers';

let token: string;

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  await createLocation(token, 'MAIN');
});

describe('GET /audit/logs', () => {
  it('records logins and entity creation', async () => {
    const res = await request(app).get('/audit/logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const actions = res.body.map((log: any) => log.action);
    expect(actions).toContain('LOGIN');
    expect(actions).toContain('CREATE');
  });

  it('includes the acting user details', async () => {
    const res = await request(app).get('/audit/logs').set('Authorization', `Bearer ${token}`);
    const login = res.body.find((log: any) => log.action === 'LOGIN');
    expect(login.User.email).toBe(ADMIN.email);
  });

  it('filters by action', async () => {
    const res = await request(app)
      .get('/audit/logs?action=LOGIN')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const log of res.body) {
      expect(log.action).toBe('LOGIN');
    }
  });

  it('supports date range filters', async () => {
    const past = await request(app)
      .get('/audit/logs?startDate=2000-01-01&endDate=2000-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(past.status).toBe(200);
    expect(past.body).toHaveLength(0);

    const now = await request(app)
      .get('/audit/logs?startDate=2000-01-01')
      .set('Authorization', `Bearer ${token}`);
    expect(now.status).toBe(200);
    expect(now.body.length).toBeGreaterThan(0);
  });

  it('is admin-only', async () => {
    const associateToken = await loginAs(ASSOCIATE);
    const res = await request(app).get('/audit/logs').set('Authorization', `Bearer ${associateToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /audit/stats', () => {
  it('aggregates counts by action, entity type, and user', async () => {
    const res = await request(app).get('/audit/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.byAction.LOGIN).toBeGreaterThan(0);
    expect(res.body.byAction.CREATE).toBeGreaterThan(0);

    const userEntries = Object.values(res.body.byUser) as any[];
    expect(userEntries.some(u => u.name === 'Test Admin' && u.count > 0)).toBe(true);
  });

  it('respects date range filters', async () => {
    const res = await request(app)
      .get('/audit/stats?startDate=2000-01-01&endDate=2000-12-31')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});
