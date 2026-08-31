import request from 'supertest';
import { sequelize } from '../src/models';
import app from '../src/app';
import { hash } from '../src/services/hash';

export { sequelize, app };

export const ADMIN = { email: 'admin@test.local', password: 'Admin123!' };
export const ASSOCIATE = { email: 'associate@test.local', password: 'Assoc123!' };
export const INACTIVE = { email: 'inactive@test.local', password: 'Inact123!' };

/** Drop and recreate all tables, then create one user per role. */
export async function resetDb() {
  await sequelize.sync({ force: true });
  const { User } = sequelize.models;
  await User.create({
    name: 'Test Admin',
    email: ADMIN.email,
    passwordHash: await hash(ADMIN.password),
    role: 'ADMIN'
  });
  await User.create({
    name: 'Test Associate',
    email: ASSOCIATE.email,
    passwordHash: await hash(ASSOCIATE.password),
    role: 'ASSOCIATE'
  });
  await User.create({
    name: 'Deactivated User',
    email: INACTIVE.email,
    passwordHash: await hash(INACTIVE.password),
    role: 'ASSOCIATE',
    active: false
  });
}

export async function loginAs(credentials: { email: string; password: string }): Promise<string> {
  const res = await request(app).post('/auth/login').send(credentials);
  if (res.status !== 200) {
    throw new Error(`Login failed for ${credentials.email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken;
}

/** Create a location and return its id. */
export async function createLocation(token: string, code: string): Promise<number> {
  const res = await request(app)
    .post('/locations')
    .set('Authorization', `Bearer ${token}`)
    .send({ code, description: `${code} location` });
  if (res.status !== 201) throw new Error(`createLocation failed: ${res.status}`);
  return res.body.id;
}

/** Create a material and return its id. */
export async function createMaterial(token: string, sku: string, minStock = 0): Promise<number> {
  const res = await request(app)
    .post('/materials')
    .set('Authorization', `Bearer ${token}`)
    .send({ sku, name: `Material ${sku}`, uom: 'KG', minStock });
  if (res.status !== 201) throw new Error(`createMaterial failed: ${res.status}`);
  return res.body.id;
}

/** Create a product and return its id. */
export async function createProduct(token: string, sku: string): Promise<number> {
  const res = await request(app)
    .post('/products')
    .set('Authorization', `Bearer ${token}`)
    .send({ sku, name: `Product ${sku}`, uom: 'UNIT' });
  if (res.status !== 201) throw new Error(`createProduct failed: ${res.status}`);
  return res.body.id;
}

export async function createBomItem(token: string, productId: number, materialId: number, qtyPerUnit: number) {
  const res = await request(app)
    .post('/bom')
    .set('Authorization', `Bearer ${token}`)
    .send({ productId, materialId, qtyPerUnit });
  if (res.status !== 201) throw new Error(`createBomItem failed: ${res.status}`);
  return res.body;
}
