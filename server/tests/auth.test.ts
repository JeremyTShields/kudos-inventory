import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAs, ADMIN, ASSOCIATE, INACTIVE } from './helpers';

beforeAll(async () => {
  await resetDb();
});

describe('POST /auth/login', () => {
  it('returns an access token for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');

    // Token payload must carry id, email, and role
    const payloadSegment = res.body.accessToken.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString());
    expect(payload.email).toBe(ADMIN.email);
    expect(payload.role).toBe('ADMIN');
    expect(typeof payload.sub).toBe('number');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app).post('/auth/login').send({ email: ADMIN.email, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@test.local', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects a deactivated user with 401', async () => {
    const res = await request(app).post('/auth/login').send(INACTIVE);
    expect(res.status).toBe(401);
    expect(res.body.accessToken).toBeUndefined();
  });
});

describe('POST /auth/register', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'New', email: 'new@test.local', password: 'Newpass1!'
    });
    expect(res.status).toBe(401);
  });

  it('forbids associates from creating users', async () => {
    const token = await loginAs(ASSOCIATE);
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New', email: 'new@test.local', password: 'Newpass1!' });
    expect(res.status).toBe(403);
  });

  it('lets an admin create a user who can then log in', async () => {
    const token = await loginAs(ADMIN);
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New User', email: 'new@test.local', password: 'Newpass1!', role: 'ASSOCIATE' });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('number');

    const login = await request(app).post('/auth/login').send({ email: 'new@test.local', password: 'Newpass1!' });
    expect(login.status).toBe(200);
  });

  it('rejects a duplicate email with 409', async () => {
    const token = await loginAs(ADMIN);
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dup', email: ASSOCIATE.email, password: 'Whatever1!' });
    expect(res.status).toBe(409);
  });

  it('rejects missing fields with 400', async () => {
    const token = await loginAs(ADMIN);
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'incomplete@test.local' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid role with 400', async () => {
    const token = await loginAs(ADMIN);
    const res = await request(app)
      .post('/auth/register')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Role', email: 'badrole@test.local', password: 'Whatever1!', role: 'SUPERUSER' });
    expect(res.status).toBe(400);
  });
});

describe('auth middleware', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/materials');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const token = await loginAs(ADMIN);
    const res = await request(app)
      .get('/materials')
      .set('Authorization', `Bearer ${token}x`);
    expect(res.status).toBe(401);
  });

  it('forbids associates from admin-only endpoints', async () => {
    const token = await loginAs(ASSOCIATE);
    const adjust = await request(app)
      .post('/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({ itemType: 'MATERIAL', itemId: 1, locationId: 1, qty: 5 });
    expect(adjust.status).toBe(403);

    const audit = await request(app)
      .get('/audit/logs')
      .set('Authorization', `Bearer ${token}`);
    expect(audit.status).toBe(403);
  });
});

describe('unknown routes', () => {
  it('responds with JSON 404', async () => {
    const res = await request(app).get('/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
