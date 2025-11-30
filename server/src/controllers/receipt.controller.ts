import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';

export const getAllReceipts = async (req: Request, res: Response) => {
  try {
    const receipts = await sequelize.models.Receipt.findAll({
      order: [['receivedAt', 'DESC']],
      include: [{ model: sequelize.models.ReceiptLine }]
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
    const userId = (req as any).user.sub;

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

      // Create inventory transaction
      await sequelize.models.InventoryTxn.create({
        txnType: 'MATERIAL_IN',
        entityType: 'RECEIPT',
        entityId: receiptId,
        itemType: 'MATERIAL',
        itemId: materialId,
        qty,
        locationId,
        userId,
        occurredAt: new Date(receivedAt)
      }, { transaction: t });
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
