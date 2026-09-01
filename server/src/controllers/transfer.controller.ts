import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';
import { LotError, allocateLots, modelForItemType, validateManualLot, ItemType } from '../services/lots';

const lineIncludes = () => [{
  model: sequelize.models.TransferLine,
  include: [
    { model: sequelize.models.Location, as: 'FromLocation' },
    { model: sequelize.models.Location, as: 'ToLocation' }
  ]
}];

export const getAllTransfers = async (req: Request, res: Response) => {
  try {
    const transfers = await sequelize.models.Transfer.findAll({
      order: [['transferredAt', 'DESC']],
      include: lineIncludes()
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
};

export const getTransferById = async (req: Request, res: Response) => {
  try {
    const transfer = await sequelize.models.Transfer.findByPk(req.params.id, {
      include: lineIncludes()
    });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfer' });
  }
};

export const createTransfer = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { transferredAt, notes, lines } = req.body;
    const userId = req.user!.sub;

    if (!transferredAt || !lines || !Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Transfer date and at least one line item are required' });
    }

    // Create transfer
    const transfer = await sequelize.models.Transfer.create({
      userId,
      transferredAt: new Date(transferredAt),
      notes: notes || ''
    }, { transaction: t });

    const transferId = transfer.get('id') as number;

    // Create transfer lines and the paired inventory transactions
    for (const line of lines) {
      const { itemType, itemId, qty, fromLocationId, toLocationId } = line;

      if (!itemType || !itemId || !qty || !fromLocationId || !toLocationId) {
        await t.rollback();
        return res.status(400).json({ error: 'Each line must have itemType, itemId, qty, fromLocationId, and toLocationId' });
      }

      if (!['MATERIAL', 'PRODUCT', 'WIP'].includes(itemType)) {
        await t.rollback();
        return res.status(400).json({ error: 'Item type must be MATERIAL, PRODUCT, or WIP' });
      }

      if (fromLocationId === toLocationId) {
        await t.rollback();
        return res.status(400).json({ error: 'Source and destination locations must differ' });
      }

      const parsedQty = parseFloat(qty);
      if (!(parsedQty > 0)) {
        await t.rollback();
        return res.status(400).json({ error: 'Quantity must be greater than zero' });
      }

      // Verify item and both locations exist
      const item = await modelForItemType(itemType as ItemType).findByPk(itemId);
      if (!item) {
        await t.rollback();
        return res.status(404).json({ error: `${itemType} ${itemId} not found` });
      }

      const fromLocation = await sequelize.models.Location.findByPk(fromLocationId);
      const toLocation = await sequelize.models.Location.findByPk(toLocationId);
      if (!fromLocation) {
        await t.rollback();
        return res.status(404).json({ error: `Location ${fromLocationId} not found` });
      }
      if (!toLocation) {
        await t.rollback();
        return res.status(404).json({ error: `Location ${toLocationId} not found` });
      }

      // Create transfer line
      await sequelize.models.TransferLine.create({
        transferId,
        itemType,
        itemId,
        qty: parsedQty,
        fromLocationId,
        toLocationId
      }, { transaction: t });

      // Paired inventory transactions: stock leaves the source and arrives
      // at the destination, netting to zero overall. Tracked items keep
      // their lot identity through the move.
      const occurredAt = new Date(transferredAt);
      const writePair = async (moveQty: number, lotId: number | null) => {
        await sequelize.models.InventoryTxn.create({
          txnType: 'TRANSFER_OUT',
          entityType: 'TRANSFER',
          entityId: transferId,
          itemType,
          itemId,
          qty: -moveQty,
          locationId: fromLocationId,
          ...(lotId !== null && { lotId }),
          userId,
          occurredAt
        }, { transaction: t });

        await sequelize.models.InventoryTxn.create({
          txnType: 'TRANSFER_IN',
          entityType: 'TRANSFER',
          entityId: transferId,
          itemType,
          itemId,
          qty: moveQty,
          locationId: toLocationId,
          ...(lotId !== null && { lotId }),
          userId,
          occurredAt
        }, { transaction: t });
      };

      if (item.get('trackingType') === 'NONE') {
        await writePair(parsedQty, null);
      } else if (item.get('lotPicking') === 'FIFO') {
        const allocations = await allocateLots(itemType as ItemType, itemId, fromLocationId, parsedQty, t);
        for (const allocation of allocations) {
          await writePair(allocation.qty, allocation.lotId);
        }
      } else {
        if (!line.lotId) {
          throw new LotError(`${item.get('sku')} uses manual lot picking: each line needs a lotId`);
        }
        await validateManualLot(itemType as ItemType, itemId, fromLocationId, Number(line.lotId), parsedQty, t);
        await writePair(parsedQty, Number(line.lotId));
      }
    }

    await t.commit();

    // Log audit
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'TRANSFER',
      entityId: transferId,
      description: `Created transfer with ${lines.length} line(s)`,
      metadata: { lineCount: lines.length }
    });

    // Fetch the complete transfer with all related data
    const result = await sequelize.models.Transfer.findByPk(transferId, {
      include: lineIncludes()
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    if (error instanceof LotError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
};

export const deleteTransfer = async (req: Request, res: Response) => {
  try {
    const transfer = await sequelize.models.Transfer.findByPk(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transferId = transfer.get('id') as number;

    // Note: This doesn't delete inventory transactions to maintain audit trail
    await transfer.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'TRANSFER',
      entityId: transferId,
      description: `Deleted transfer #${transferId}`
    });

    res.json({ message: 'Transfer deleted successfully (inventory transactions preserved)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
};
