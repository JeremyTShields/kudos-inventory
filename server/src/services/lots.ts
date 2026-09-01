import { Model, QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/db';

export type ItemType = 'MATERIAL' | 'PRODUCT' | 'WIP';

export const ITEM_TYPES: ItemType[] = ['MATERIAL', 'PRODUCT', 'WIP'];

/** Validation problems raised by lot handling; controllers map these to HTTP responses. */
export class LotError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function modelForItemType(itemType: ItemType) {
  if (itemType === 'MATERIAL') return sequelize.models.Material;
  if (itemType === 'PRODUCT') return sequelize.models.Product;
  return sequelize.models.WipItem;
}

export async function getOrCreateLot(itemType: ItemType, itemId: number, lotNumber: string, t?: Transaction) {
  const [lot] = await sequelize.models.Lot.findOrCreate({
    where: { itemType, itemId, lotNumber },
    transaction: t
  });
  return lot;
}

/**
 * Reserve `count` serial numbers for a tracked item using its configured
 * prefix and sequence; the item's next-sequence counter is advanced and
 * persisted so numbers are never reused.
 */
export async function generateSerials(item: Model, count: number, t?: Transaction): Promise<string[]> {
  const prefix = (item.get('serialPrefix') as string) || 'SN-';
  let seq = Number(item.get('serialNextSeq') || 1);
  const serials: string[] = [];
  for (let i = 0; i < count; i++) {
    serials.push(`${prefix}${String(seq).padStart(6, '0')}`);
    seq++;
  }
  await item.update({ serialNextSeq: seq }, { transaction: t });
  return serials;
}

/** Serialized receipts and outputs must be whole units, one serial each. */
export function requireIntegerQty(qty: number, context: string): number {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new LotError(`${context} of a serialized item must be a positive whole number`);
  }
  return qty;
}

export interface LotAllocation {
  lotId: number;
  qty: number;
}

/** Lot-level stock rows for one item at (optionally) one location. */
export async function lotStock(itemType: ItemType, itemId: number, locationId?: number, t?: Transaction) {
  const rows: any[] = await sequelize.query(`
    SELECT tx.lotId as lotId, l.lotNumber as lotNumber, tx.locationId as locationId,
           SUM(tx.qty) as available, MIN(l.createdAt) as lotCreatedAt
    FROM inventory_txns tx
    JOIN lots l ON l.id = tx.lotId
    WHERE tx.itemType = :itemType AND tx.itemId = :itemId AND tx.lotId IS NOT NULL
      ${locationId ? 'AND tx.locationId = :locationId' : ''}
    GROUP BY tx.lotId, l.lotNumber, tx.locationId
    HAVING SUM(tx.qty) > 0
    ORDER BY lotCreatedAt ASC, tx.lotId ASC
  `, {
    replacements: { itemType, itemId, locationId },
    type: QueryTypes.SELECT,
    transaction: t
  });
  return rows.map(row => ({
    lotId: Number(row.lotId),
    lotNumber: row.lotNumber as string,
    locationId: Number(row.locationId),
    available: parseFloat(row.available)
  }));
}

/**
 * FIFO-allocate `qty` of a tracked item at a location: oldest lots first,
 * splitting across lots as needed. Throws when tracked stock cannot cover
 * the quantity.
 */
export async function allocateLots(
  itemType: ItemType,
  itemId: number,
  locationId: number,
  qty: number,
  t?: Transaction
): Promise<LotAllocation[]> {
  const stock = await lotStock(itemType, itemId, locationId, t);
  const allocations: LotAllocation[] = [];
  let remaining = qty;

  for (const row of stock) {
    if (remaining <= 1e-9) break;
    const take = Math.min(remaining, row.available);
    allocations.push({ lotId: row.lotId, qty: take });
    remaining -= take;
  }

  if (remaining > 1e-9) {
    throw new LotError(`Insufficient lot-tracked stock for ${itemType} #${itemId} at location ${locationId} (short ${remaining})`);
  }

  return allocations;
}

/** Validate a manually chosen lot: it must belong to the item and hold enough stock at the location. */
export async function validateManualLot(
  itemType: ItemType,
  itemId: number,
  locationId: number,
  lotId: number,
  qty: number,
  t?: Transaction
) {
  const lot = await sequelize.models.Lot.findByPk(lotId, { transaction: t });
  if (!lot || lot.get('itemType') !== itemType || Number(lot.get('itemId')) !== Number(itemId)) {
    throw new LotError(`Lot ${lotId} does not belong to ${itemType} #${itemId}`);
  }
  const stock = await lotStock(itemType, itemId, locationId, t);
  const row = stock.find(entry => entry.lotId === Number(lotId));
  const available = row ? row.available : 0;
  if (available + 1e-9 < qty) {
    throw new LotError(`Lot ${lot.get('lotNumber')} has ${available} available at location ${locationId}, need ${qty}`);
  }
  return lot;
}
