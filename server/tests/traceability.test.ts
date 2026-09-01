import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, sequelize, resetDb, loginAs, ADMIN, createLocation } from './helpers';

let token: string;
let mainId: number;
let dockId: number;
let lotMatId: number;      // LOT tracked, FIFO
let serialMatId: number;   // SERIAL tracked
let manualMatId: number;   // LOT tracked, MANUAL picking
let wipId: number;         // LOT tracked, FIFO; BOM consumes lotMat 2/unit
let productId: number;     // SERIAL tracked; BOM: 1 WIP + 1 manualMat per unit

async function post(path: string, body: any) {
  return request(app).post(path).set('Authorization', `Bearer ${token}`).send(body);
}

async function get(path: string) {
  return request(app).get(path).set('Authorization', `Bearer ${token}`);
}

async function lotRows(itemType: string, itemId: number, locationId?: number) {
  const query = `/inventory/lots?itemType=${itemType}&itemId=${itemId}${locationId ? `&locationId=${locationId}` : ''}`;
  const res = await get(query);
  expect(res.status).toBe(200);
  return res.body as Array<{ lotId: number; lotNumber: string; locationId: number; available: number }>;
}

beforeAll(async () => {
  await resetDb();
  token = await loginAs(ADMIN);
  mainId = await createLocation(token, 'MAIN');
  dockId = await createLocation(token, 'DOCK');

  const lotMat = await post('/materials', { sku: 'MAT-LOTTED', name: 'Lotted Resin', uom: 'KG', trackingType: 'LOT' });
  lotMatId = lotMat.body.id;

  const serialMat = await post('/materials', { sku: 'MAT-SERIAL', name: 'Serialized Motor', uom: 'EA', trackingType: 'SERIAL', serialPrefix: 'MTR-' });
  serialMatId = serialMat.body.id;

  const manualMat = await post('/materials', { sku: 'MAT-MANUAL', name: 'Manual-Pick Alloy', uom: 'KG', trackingType: 'LOT', lotPicking: 'MANUAL' });
  manualMatId = manualMat.body.id;

  const wip = await post('/wip-items', { sku: 'WIP-CORE', name: 'Core Assembly', uom: 'UNIT', trackingType: 'LOT' });
  wipId = wip.body.id;

  const product = await post('/products', { sku: 'PROD-TRACED', name: 'Traced Product', uom: 'UNIT', trackingType: 'SERIAL', serialPrefix: 'WGT-' });
  productId = product.body.id;

  // WIP BOM: 2 lotted resin per unit
  await post('/bom', { parentType: 'WIP', parentId: wipId, componentType: 'MATERIAL', componentId: lotMatId, qtyPerUnit: 2 });
  // Product BOM: 1 core assembly + 1 manual alloy per unit
  await post('/bom', { parentType: 'PRODUCT', parentId: productId, componentType: 'WIP', componentId: wipId, qtyPerUnit: 1 });
  await post('/bom', { parentType: 'PRODUCT', parentId: productId, componentType: 'MATERIAL', componentId: manualMatId, qtyPerUnit: 1 });
});

describe('receipts with tracking', () => {
  it('rejects a lot-tracked line without a lot number', async () => {
    const res = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-01',
      lines: [{ materialId: lotMatId, qty: 100, locationId: mainId }]
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lot/i);
  });

  it('creates lots for lot-tracked receipts', async () => {
    const first = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-01',
      lines: [{ materialId: lotMatId, qty: 100, locationId: mainId, lotNumber: 'LOT-A' }]
    });
    expect(first.status).toBe(201);

    const second = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-02',
      lines: [{ materialId: lotMatId, qty: 50, locationId: mainId, lotNumber: 'LOT-B' }]
    });
    expect(second.status).toBe(201);

    const rows = await lotRows('MATERIAL', lotMatId, mainId);
    expect(rows.map(row => [row.lotNumber, row.available])).toEqual([['LOT-A', 100], ['LOT-B', 50]]);
  });

  it('creates one lot and one unit transaction per serial', async () => {
    const res = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-03',
      lines: [{ materialId: serialMatId, qty: 3, locationId: mainId, serialNumbers: ['S1', 'S2', 'S3'] }]
    });
    expect(res.status).toBe(201);

    const txns = await sequelize.models.InventoryTxn.findAll({
      where: { itemType: 'MATERIAL', itemId: serialMatId }
    });
    expect(txns).toHaveLength(3);
    for (const txn of txns) {
      expect(parseFloat(txn.get('qty') as string)).toBe(1);
      expect(txn.get('lotId')).toBeTruthy();
    }

    const rows = await lotRows('MATERIAL', serialMatId);
    expect(rows.map(row => row.lotNumber).sort()).toEqual(['S1', 'S2', 'S3']);
  });

  it('rejects serial count mismatches and duplicate serials', async () => {
    const mismatch = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-03',
      lines: [{ materialId: serialMatId, qty: 2, locationId: mainId, serialNumbers: ['S9'] }]
    });
    expect(mismatch.status).toBe(400);

    const duplicate = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-03',
      lines: [{ materialId: serialMatId, qty: 1, locationId: mainId, serialNumbers: ['S1'] }]
    });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error).toMatch(/already exists/i);
  });

  it('auto-generates serials from the item prefix when none are given', async () => {
    const res = await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-03',
      lines: [{ materialId: serialMatId, qty: 2, locationId: mainId }]
    });
    expect(res.status).toBe(201);

    const rows = await lotRows('MATERIAL', serialMatId);
    const generated = rows.map(row => row.lotNumber).filter(number => number.startsWith('MTR-'));
    expect(generated).toEqual(['MTR-000001', 'MTR-000002']);
  });
});

describe('production with tracking', () => {
  it('requires a lot number for lot-tracked output', async () => {
    const res = await post('/production', {
      outputType: 'WIP', productId: wipId, quantityProduced: 10, locationId: mainId,
      startedAt: '2026-09-04', completedAt: '2026-09-04'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/lot/i);
  });

  it('consumes FIFO from the oldest lot and lots the WIP output', async () => {
    const res = await post('/production', {
      outputType: 'WIP', productId: wipId, quantityProduced: 10, locationId: mainId,
      outputLotNumber: 'WIP-L1',
      startedAt: '2026-09-04', completedAt: '2026-09-04'
    });
    expect(res.status).toBe(201);
    expect(res.body.WipItem.sku).toBe('WIP-CORE');

    // 20 resin consumed, all from LOT-A (oldest)
    const rows = await lotRows('MATERIAL', lotMatId, mainId);
    expect(rows.map(row => [row.lotNumber, row.available])).toEqual([['LOT-A', 80], ['LOT-B', 50]]);

    const wipRows = await lotRows('WIP', wipId, mainId);
    expect(wipRows.map(row => [row.lotNumber, row.available])).toEqual([['WIP-L1', 10]]);

    const consume = await sequelize.models.InventoryTxn.findAll({
      where: { txnType: 'MATERIAL_CONSUME', entityId: res.body.id, entityType: 'PRODUCTION' }
    });
    expect(consume).toHaveLength(1);
    expect(consume[0].get('lotId')).toBeTruthy();
  });

  it('splits FIFO consumption across lots when the oldest is short', async () => {
    // Needs 90 resin: LOT-A has 80, remainder comes from LOT-B
    const res = await post('/production', {
      outputType: 'WIP', productId: wipId, quantityProduced: 45, locationId: mainId,
      outputLotNumber: 'WIP-L2',
      startedAt: '2026-09-05', completedAt: '2026-09-05'
    });
    expect(res.status).toBe(201);

    const consume = await sequelize.models.InventoryTxn.findAll({
      where: { txnType: 'MATERIAL_CONSUME', entityId: res.body.id, entityType: 'PRODUCTION' },
      order: [['id', 'ASC']]
    });
    expect(consume).toHaveLength(2);
    expect(parseFloat(consume[0].get('qty') as string)).toBeCloseTo(-80, 5);
    expect(parseFloat(consume[1].get('qty') as string)).toBeCloseTo(-10, 5);

    const rows = await lotRows('MATERIAL', lotMatId, mainId);
    expect(rows.map(row => [row.lotNumber, row.available])).toEqual([['LOT-B', 40]]);
  });

  it('rejects the run when tracked component stock is insufficient', async () => {
    const res = await post('/production', {
      outputType: 'WIP', productId: wipId, quantityProduced: 100, locationId: mainId,
      outputLotNumber: 'WIP-L3',
      startedAt: '2026-09-06', completedAt: '2026-09-06'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);

    // Nothing partial was written
    const orphan = await sequelize.models.InventoryTxn.count({
      where: { itemType: 'WIP', itemId: wipId, txnType: 'WIP_IN' }
    });
    expect(orphan).toBe(2); // only the two successful runs above
  });

  it('requires manual lots for manual-picking components', async () => {
    // Stock the manual alloy first
    await post('/receipts', {
      supplierName: 'Acme', receivedAt: '2026-09-06',
      lines: [{ materialId: manualMatId, qty: 30, locationId: mainId, lotNumber: 'ML-1' }]
    });

    const missing = await post('/production', {
      outputType: 'PRODUCT', productId, quantityProduced: 5, locationId: mainId,
      startedAt: '2026-09-07', completedAt: '2026-09-07'
    });
    expect(missing.status).toBe(400);
    expect(missing.body.error).toMatch(/manual lot/i);
  });

  it('produces serialized product consuming WIP (FIFO) and manual lots as specified', async () => {
    const manualLot = await sequelize.models.Lot.findOne({ where: { lotNumber: 'ML-1' } });

    const res = await post('/production', {
      outputType: 'PRODUCT', productId, quantityProduced: 5, locationId: mainId,
      componentLots: [{ componentType: 'MATERIAL', componentId: manualMatId, lotId: manualLot!.get('id'), qty: 5 }],
      startedAt: '2026-09-07', completedAt: '2026-09-07'
    });
    expect(res.status).toBe(201);

    // WIP consumed FIFO from WIP-L1 first
    const wipConsume = await sequelize.models.InventoryTxn.findAll({
      where: { txnType: 'WIP_CONSUME', entityId: res.body.id, entityType: 'PRODUCTION' }
    });
    expect(wipConsume).toHaveLength(1);
    expect(parseFloat(wipConsume[0].get('qty') as string)).toBeCloseTo(-5, 5);
    const wipRows = await lotRows('WIP', wipId, mainId);
    expect(wipRows.map(row => [row.lotNumber, row.available])).toEqual([['WIP-L1', 5], ['WIP-L2', 45]]);

    // Output is five serialized units with generated WGT- serials
    const productRows = await lotRows('PRODUCT', productId, mainId);
    expect(productRows).toHaveLength(5);
    expect(productRows.every(row => row.lotNumber.startsWith('WGT-') && row.available === 1)).toBe(true);

    // Manual alloy came out of the named lot
    const manualRows = await lotRows('MATERIAL', manualMatId, mainId);
    expect(manualRows.map(row => [row.lotNumber, row.available])).toEqual([['ML-1', 25]]);
  });
});

describe('transfers, shipments, and adjustments with tracking', () => {
  it('keeps lot identity through FIFO transfers', async () => {
    const res = await post('/transfers', {
      transferredAt: '2026-09-08',
      lines: [{ itemType: 'MATERIAL', itemId: lotMatId, qty: 10, fromLocationId: mainId, toLocationId: dockId }]
    });
    expect(res.status).toBe(201);

    const atDock = await lotRows('MATERIAL', lotMatId, dockId);
    expect(atDock.map(row => [row.lotNumber, row.available])).toEqual([['LOT-B', 10]]);
    const atMain = await lotRows('MATERIAL', lotMatId, mainId);
    expect(atMain.map(row => [row.lotNumber, row.available])).toEqual([['LOT-B', 30]]);
  });

  it('transfers WIP with lot identity', async () => {
    const res = await post('/transfers', {
      transferredAt: '2026-09-08',
      lines: [{ itemType: 'WIP', itemId: wipId, qty: 3, fromLocationId: mainId, toLocationId: dockId }]
    });
    expect(res.status).toBe(201);

    const atDock = await lotRows('WIP', wipId, dockId);
    expect(atDock.map(row => [row.lotNumber, row.available])).toEqual([['WIP-L1', 3]]);
  });

  it('ships serialized product by FIFO, one transaction per unit', async () => {
    const res = await post('/shipments', {
      customerName: 'Customer', shippedAt: '2026-09-09',
      lines: [{ productId, qty: 2, locationId: mainId }]
    });
    expect(res.status).toBe(201);

    const out = await sequelize.models.InventoryTxn.findAll({
      where: { txnType: 'PRODUCT_OUT', entityId: res.body.id, entityType: 'SHIPMENT' }
    });
    expect(out).toHaveLength(2);
    for (const txn of out) {
      expect(parseFloat(txn.get('qty') as string)).toBeCloseTo(-1, 5);
      expect(txn.get('lotId')).toBeTruthy();
    }

    const remaining = await lotRows('PRODUCT', productId, mainId);
    expect(remaining).toHaveLength(3);
  });

  it('requires a lot for negative adjustments of manual-picking items', async () => {
    const missing = await post('/inventory/adjust', {
      itemType: 'MATERIAL', itemId: manualMatId, locationId: mainId, qty: -2
    });
    expect(missing.status).toBe(400);

    const manualLot = await sequelize.models.Lot.findOne({ where: { lotNumber: 'ML-1' } });
    const ok = await post('/inventory/adjust', {
      itemType: 'MATERIAL', itemId: manualMatId, locationId: mainId, qty: -2, lotId: manualLot!.get('id')
    });
    expect(ok.status).toBe(201);

    const rows = await lotRows('MATERIAL', manualMatId, mainId);
    expect(rows.map(row => [row.lotNumber, row.available])).toEqual([['ML-1', 23]]);
  });

  it('requires a lot number for positive adjustments of lot-tracked items', async () => {
    const missing = await post('/inventory/adjust', {
      itemType: 'WIP', itemId: wipId, locationId: mainId, qty: 4
    });
    expect(missing.status).toBe(400);

    const ok = await post('/inventory/adjust', {
      itemType: 'WIP', itemId: wipId, locationId: mainId, qty: 4, lotNumber: 'WIP-ADJ'
    });
    expect(ok.status).toBe(201);

    const rows = await lotRows('WIP', wipId, mainId);
    expect(rows.find(row => row.lotNumber === 'WIP-ADJ')?.available).toBe(4);
  });
});
