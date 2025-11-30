import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';

export const getAllShipments = async (req: Request, res: Response) => {
  try {
    const shipments = await sequelize.models.Shipment.findAll({
      order: [['shippedAt', 'DESC']],
      include: [{ model: sequelize.models.ShipmentLine }]
    });
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
};

export const getShipmentById = async (req: Request, res: Response) => {
  try {
    const shipment = await sequelize.models.Shipment.findByPk(req.params.id, {
      include: [{
        model: sequelize.models.ShipmentLine,
        include: [
          { model: sequelize.models.Product },
          { model: sequelize.models.Location }
        ]
      }]
    });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
};

export const createShipment = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { customerName, shippedAt, lines } = req.body;
    const userId = (req as any).user.sub;

    if (!customerName || !shippedAt || !lines || !Array.isArray(lines) || lines.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Customer name, shipped date, and at least one line item are required' });
    }

    // Create shipment
    const shipment = await sequelize.models.Shipment.create({
      customerName,
      userId,
      shippedAt: new Date(shippedAt)
    }, { transaction: t });

    const shipmentId = shipment.get('id') as number;

    // Create shipment lines and inventory transactions
    for (const line of lines) {
      const { productId, qty, locationId } = line;

      if (!productId || !qty || !locationId) {
        await t.rollback();
        return res.status(400).json({ error: 'Each line must have productId, qty, and locationId' });
      }

      // Verify product and location exist
      const product = await sequelize.models.Product.findByPk(productId);
      const location = await sequelize.models.Location.findByPk(locationId);

      if (!product) {
        await t.rollback();
        return res.status(404).json({ error: `Product ${productId} not found` });
      }
      if (!location) {
        await t.rollback();
        return res.status(404).json({ error: `Location ${locationId} not found` });
      }

      // Create shipment line
      await sequelize.models.ShipmentLine.create({
        shipmentId,
        productId,
        qty,
        locationId
      }, { transaction: t });

      // Create inventory transaction (negative qty for outgoing)
      await sequelize.models.InventoryTxn.create({
        txnType: 'PRODUCT_OUT',
        entityType: 'SHIPMENT',
        entityId: shipmentId,
        itemType: 'PRODUCT',
        itemId: productId,
        qty: -qty, // Negative for outgoing
        locationId,
        userId,
        occurredAt: new Date(shippedAt)
      }, { transaction: t });
    }

    await t.commit();

    // Log audit
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'SHIPMENT',
      entityId: shipmentId,
      description: `Created shipment for ${customerName} with ${lines.length} line(s)`,
      metadata: { customerName, lineCount: lines.length }
    });

    // Fetch the complete shipment with all related data
    const result = await sequelize.models.Shipment.findByPk(shipmentId, {
      include: [{
        model: sequelize.models.ShipmentLine,
        include: [
          { model: sequelize.models.Product },
          { model: sequelize.models.Location }
        ]
      }]
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create shipment' });
  }
};

export const deleteShipment = async (req: Request, res: Response) => {
  try {
    const shipment = await sequelize.models.Shipment.findByPk(req.params.id);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    // Note: This doesn't delete inventory transactions to maintain audit trail
    await shipment.destroy();
    res.json({ message: 'Shipment deleted successfully (inventory transactions preserved)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
};
