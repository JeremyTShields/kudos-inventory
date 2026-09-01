import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';
import { LotError, allocateLots, validateManualLot } from '../services/lots';

export const getAllShipments = async (req: Request, res: Response) => {
  try {
    const shipments = await sequelize.models.Shipment.findAll({
      order: [['shippedAt', 'DESC']],
      include: [{
        model: sequelize.models.ShipmentLine,
        include: [
          { model: sequelize.models.Product },
          { model: sequelize.models.Location }
        ]
      }]
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
    const userId = req.user!.sub;

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

      // Create inventory transactions (negative qty for outgoing),
      // resolving lots for tracked products
      const baseTxn = {
        txnType: 'PRODUCT_OUT',
        entityType: 'SHIPMENT',
        entityId: shipmentId,
        itemType: 'PRODUCT',
        itemId: productId,
        locationId,
        userId,
        occurredAt: new Date(shippedAt)
      };

      const shippedQty = parseFloat(qty);
      if (product.get('trackingType') === 'NONE') {
        await sequelize.models.InventoryTxn.create({ ...baseTxn, qty: -qty }, { transaction: t });
      } else if (product.get('lotPicking') === 'FIFO') {
        const allocations = await allocateLots('PRODUCT', productId, locationId, shippedQty, t);
        for (const allocation of allocations) {
          await sequelize.models.InventoryTxn.create({
            ...baseTxn,
            qty: -allocation.qty,
            lotId: allocation.lotId
          }, { transaction: t });
        }
      } else {
        if (!line.lotId) {
          throw new LotError(`${product.get('sku')} uses manual lot picking: each line needs a lotId`);
        }
        await validateManualLot('PRODUCT', productId, locationId, Number(line.lotId), shippedQty, t);
        await sequelize.models.InventoryTxn.create({
          ...baseTxn,
          qty: -qty,
          lotId: Number(line.lotId)
        }, { transaction: t });
      }
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
    if (error instanceof LotError) {
      return res.status(error.status).json({ error: error.message });
    }
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
