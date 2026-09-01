import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';

const PO_STATUSES = ['OPEN', 'RECEIVED', 'CANCELLED'];

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const orders = await sequelize.models.PurchaseOrder.findAll({
      order: [['orderedAt', 'DESC']],
      include: [{
        model: sequelize.models.PurchaseOrderLine,
        include: [{ model: sequelize.models.Material }]
      }]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const order = await sequelize.models.PurchaseOrder.findByPk(req.params.id, {
      include: [{
        model: sequelize.models.PurchaseOrderLine,
        include: [{ model: sequelize.models.Material }]
      }]
    });
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
};

export const createPurchaseOrder = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { supplierName, orderedAt, notes, lines } = req.body;
    const userId = req.user!.sub;

    if (!supplierName || !orderedAt || !lines || !Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Supplier name, order date, and at least one line item are required' });
    }

    // Create purchase order
    const order = await sequelize.models.PurchaseOrder.create({
      supplierName,
      status: 'OPEN',
      orderedAt: new Date(orderedAt),
      notes: notes || '',
      userId
    }, { transaction: t });

    const orderId = order.get('id') as number;

    // Create order lines
    for (const line of lines) {
      const { materialId, qty } = line;

      if (!materialId || !qty) {
        await t.rollback();
        return res.status(400).json({ error: 'Each line must have materialId and qty' });
      }

      const material = await sequelize.models.Material.findByPk(materialId);
      if (!material) {
        await t.rollback();
        return res.status(404).json({ error: `Material ${materialId} not found` });
      }

      await sequelize.models.PurchaseOrderLine.create({
        purchaseOrderId: orderId,
        materialId,
        qty
      }, { transaction: t });
    }

    await t.commit();

    // Log audit
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'PURCHASE_ORDER',
      entityId: orderId,
      description: `Created purchase order for ${supplierName} with ${lines.length} line(s)`,
      metadata: { supplierName, lineCount: lines.length }
    });

    // Fetch the complete purchase order with all related data
    const result = await sequelize.models.PurchaseOrder.findByPk(orderId, {
      include: [{
        model: sequelize.models.PurchaseOrderLine,
        include: [{ model: sequelize.models.Material }]
      }]
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!status || !PO_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be OPEN, RECEIVED, or CANCELLED' });
    }

    const order = await sequelize.models.PurchaseOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    await order.update({ status });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: 'PURCHASE_ORDER',
      entityId: order.get('id') as number,
      description: `Set purchase order #${order.get('id')} status to ${status}`,
      metadata: { status }
    });

    const result = await sequelize.models.PurchaseOrder.findByPk(req.params.id, {
      include: [{
        model: sequelize.models.PurchaseOrderLine,
        include: [{ model: sequelize.models.Material }]
      }]
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const order = await sequelize.models.PurchaseOrder.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const orderId = order.get('id') as number;
    await sequelize.models.PurchaseOrderLine.destroy({ where: { purchaseOrderId: orderId } });
    await order.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'PURCHASE_ORDER',
      entityId: orderId,
      description: `Deleted purchase order #${orderId}`
    });

    res.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete purchase order' });
  }
};
