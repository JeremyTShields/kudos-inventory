import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';
import { LotError, generateSerials, getOrCreateLot, requireIntegerQty } from '../services/lots';

export const getAllReceipts = async (req: Request, res: Response) => {
  try {
    const receipts = await sequelize.models.Receipt.findAll({
      order: [['receivedAt', 'DESC']],
      include: [{
        model: sequelize.models.ReceiptLine,
        include: [
          { model: sequelize.models.Material },
          { model: sequelize.models.Location }
        ]
      }]
    });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

export const getReceiptById = async (req: Request, res: Response) => {
  try {
    const receipt = await sequelize.models.Receipt.findByPk(req.params.id, {
      include: [{
        model: sequelize.models.ReceiptLine,
        include: [
          { model: sequelize.models.Material },
          { model: sequelize.models.Location }
        ]
      }]
    });
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

export const createReceipt = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { supplierName, receivedAt, lines } = req.body;
    const userId = req.user!.sub;

    if (!supplierName || !receivedAt || !lines || !Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Supplier name, received date, and at least one line item are required' });
    }

    // Create receipt
    const receipt = await sequelize.models.Receipt.create({
      supplierName,
      userId,
      receivedAt: new Date(receivedAt)
    }, { transaction: t });

    const receiptId = receipt.get('id') as number;

    // Create receipt lines and inventory transactions
    for (const line of lines) {
      const { materialId, qty, locationId } = line;

      if (!materialId || !qty || !locationId) {
        await t.rollback();
        return res.status(400).json({ error: 'Each line must have materialId, qty, and locationId' });
      }

      // Verify material and location exist
      const material = await sequelize.models.Material.findByPk(materialId);
      const location = await sequelize.models.Location.findByPk(locationId);

      if (!material) {
        await t.rollback();
        return res.status(404).json({ error: `Material ${materialId} not found` });
      }
      if (!location) {
        await t.rollback();
        return res.status(404).json({ error: `Location ${locationId} not found` });
      }

      // Create receipt line
      await sequelize.models.ReceiptLine.create({
        receiptId,
        materialId,
        qty,
        locationId
      }, { transaction: t });

      // Create inventory transactions, capturing lot/serial identity for
      // tracked materials
      const baseTxn = {
        txnType: 'MATERIAL_IN',
        entityType: 'RECEIPT',
        entityId: receiptId,
        itemType: 'MATERIAL',
        itemId: materialId,
        locationId,
        userId,
        occurredAt: new Date(receivedAt)
      };

      const trackingType = material.get('trackingType') as string;
      if (trackingType === 'NONE') {
        await sequelize.models.InventoryTxn.create({ ...baseTxn, qty }, { transaction: t });
      } else if (trackingType === 'LOT') {
        if (!line.lotNumber) {
          throw new LotError(`${material.get('sku')} is lot-tracked: each line needs a lotNumber`);
        }
        const lot = await getOrCreateLot('MATERIAL', materialId, line.lotNumber, t);
        await sequelize.models.InventoryTxn.create({
          ...baseTxn,
          qty,
          lotId: lot.get('id') as number
        }, { transaction: t });
      } else {
        const count = requireIntegerQty(parseFloat(qty), 'Received quantity');
        let serials: string[];
        if (Array.isArray(line.serialNumbers) && line.serialNumbers.length > 0) {
          if (line.serialNumbers.length !== count || new Set(line.serialNumbers).size !== count) {
            throw new LotError(`${material.get('sku')}: provide ${count} unique serial numbers (got ${line.serialNumbers.length})`);
          }
          serials = line.serialNumbers;
        } else {
          serials = await generateSerials(material, count, t);
        }
        for (const serial of serials) {
          const existing = await sequelize.models.Lot.findOne({
            where: { itemType: 'MATERIAL', itemId: materialId, lotNumber: serial },
            transaction: t
          });
          if (existing) {
            throw new LotError(`Serial ${serial} already exists for ${material.get('sku')}`);
          }
          const lot = await sequelize.models.Lot.create({
            itemType: 'MATERIAL',
            itemId: materialId,
            lotNumber: serial
          }, { transaction: t });
          await sequelize.models.InventoryTxn.create({
            ...baseTxn,
            qty: 1,
            lotId: lot.get('id') as number
          }, { transaction: t });
        }
      }
    }

    await t.commit();

    // Log audit
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'RECEIPT',
      entityId: receiptId,
      description: `Created receipt from ${supplierName} with ${lines.length} line(s)`,
      metadata: { supplierName, lineCount: lines.length }
    });

    // Fetch the complete receipt with all related data
    const result = await sequelize.models.Receipt.findByPk(receiptId, {
      include: [{
        model: sequelize.models.ReceiptLine,
        include: [
          { model: sequelize.models.Material },
          { model: sequelize.models.Location }
        ]
      }]
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    if (error instanceof LotError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create receipt' });
  }
};

export const deleteReceipt = async (req: Request, res: Response) => {
  try {
    const receipt = await sequelize.models.Receipt.findByPk(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    // Note: This doesn't delete inventory transactions to maintain audit trail
    // In production, you might want to prevent deletion or create reversing transactions
    await receipt.destroy();
    res.json({ message: 'Receipt deleted successfully (inventory transactions preserved)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
};
