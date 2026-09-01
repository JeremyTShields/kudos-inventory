import { describe, it, expect, beforeAll } from 'vitest';
import { sequelize, resetDb } from './helpers';
import { allocateLots, generateSerials, LotError } from '../src/services/lots';

let materialId: number;
let locationId: number;
let lotAId: number;
let lotBId: number;

async function addStock(lotId: number, qty: number) {
  await sequelize.models.InventoryTxn.create({
    txnType: 'ADJUST',
    entityType: 'MANUAL',
    entityId: 0,
    itemType: 'MATERIAL',
    itemId: materialId,
    qty,
    locationId,
    lotId,
    userId: 1,
    occurredAt: new Date()
  });
}

beforeAll(async () => {
  await resetDb();
  const material = await sequelize.models.Material.create({
    sku: 'MAT-SVC', name: 'Service Test Material', uom: 'KG',
    trackingType: 'LOT', lotPicking: 'FIFO', serialPrefix: 'AB-', serialNextSeq: 5
  });
  materialId = material.get('id') as number;

  const location = await sequelize.models.Location.create({ code: 'SVC' });
  locationId = location.get('id') as number;

  // Lot A is created first, so FIFO must drain it before Lot B
  const lotA = await sequelize.models.Lot.create({ itemType: 'MATERIAL', itemId: materialId, lotNumber: 'LOT-A' });
  const lotB = await sequelize.models.Lot.create({ itemType: 'MATERIAL', itemId: materialId, lotNumber: 'LOT-B' });
  lotAId = lotA.get('id') as number;
  lotBId = lotB.get('id') as number;

  await addStock(lotAId, 10);
  await addStock(lotBId, 10);
});

describe('generateSerials', () => {
  it('uses the item prefix and sequence, and persists the advanced counter', async () => {
    const material = await sequelize.models.Material.findByPk(materialId);
    const serials = await generateSerials(material!, 3);
    expect(serials).toEqual(['AB-000005', 'AB-000006', 'AB-000007']);

    const reloaded = await sequelize.models.Material.findByPk(materialId);
    expect(Number(reloaded!.get('serialNextSeq'))).toBe(8);

    // The next batch continues where the last stopped
    const next = await generateSerials(reloaded!, 1);
    expect(next).toEqual(['AB-000008']);
  });
});

describe('allocateLots', () => {
  it('drains the oldest lot first and splits across lots', async () => {
    const allocations = await allocateLots('MATERIAL', materialId, locationId, 15);
    expect(allocations).toEqual([
      { lotId: lotAId, qty: 10 },
      { lotId: lotBId, qty: 5 }
    ]);
  });

  it('allocates entirely from the oldest lot when it suffices', async () => {
    const allocations = await allocateLots('MATERIAL', materialId, locationId, 4);
    expect(allocations).toEqual([{ lotId: lotAId, qty: 4 }]);
  });

  it('throws a LotError when tracked stock cannot cover the quantity', async () => {
    await expect(allocateLots('MATERIAL', materialId, locationId, 25))
      .rejects.toBeInstanceOf(LotError);
  });

  it('only counts stock at the requested location', async () => {
    const elsewhere = await sequelize.models.Location.create({ code: 'ELSEWHERE' });
    await expect(allocateLots('MATERIAL', materialId, elsewhere.get('id') as number, 1))
      .rejects.toBeInstanceOf(LotError);
  });
});
