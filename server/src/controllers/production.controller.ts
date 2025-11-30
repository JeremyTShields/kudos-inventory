import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';

export const getAllProductionRuns = async (req: Request, res: Response) => {
  try {
    const runs = await sequelize.models.ProductionRun.findAll({
      order: [['startedAt', 'DESC']],
      include: [{ model: sequelize.models.Product }]
    });
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production runs' });
  }
};

export const getProductionRunById = async (req: Request, res: Response) => {
  try {
    const run = await sequelize.models.ProductionRun.findByPk(req.params.id, {
      include: [{ model: sequelize.models.Product }]
    });
    if (!run) {
      return res.status(404).json({ error: 'Production run not found' });
    }
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production run' });
  }
};

export const createProductionRun = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const { productId, quantityProduced, locationId, startedAt, completedAt, notes } = req.body;
    const userId = (req as any).user.sub;

    if (!productId || !quantityProduced || !locationId || !startedAt || !completedAt) {
      await t.rollback();
      return res.status(400).json({
        error: 'Product ID, quantity produced, location, start time, and completion time are required'
      });
    }

    // Verify product and location exist
    const product = await sequelize.models.Product.findByPk(productId, {
      include: [{
        model: sequelize.models.BomItem,
        include: [{ model: sequelize.models.Material }]
      }]
    });
    const location = await sequelize.models.Location.findByPk(locationId);

    if (!product) {
      await t.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!location) {
      await t.rollback();
      return res.status(404).json({ error: 'Location not found' });
    }

    // Create production run
    const productionRun = await sequelize.models.ProductionRun.create({
      productId,
      quantityProduced,
      userId,
      startedAt: new Date(startedAt),
      completedAt: new Date(completedAt),
      notes: notes || ''
    }, { transaction: t });

    const runId = productionRun.get('id') as number;

    // Get BOM items for this product
    const bomItems = (product as any).BomItems || [];

    // Create inventory transactions for material consumption
    for (const bomItem of bomItems) {
      const materialQtyConsumed = parseFloat(bomItem.qtyPerUnit) * parseFloat(quantityProduced);

      await sequelize.models.InventoryTxn.create({
        txnType: 'MATERIAL_CONSUME',
        entityType: 'PRODUCTION',
        entityId: runId,
        itemType: 'MATERIAL',
        itemId: bomItem.materialId,
        qty: -materialQtyConsumed, // Negative for consumption
        locationId,
        userId,
        occurredAt: new Date(completedAt)
      }, { transaction: t });
    }

    // Create inventory transaction for product creation
    await sequelize.models.InventoryTxn.create({
      txnType: 'PRODUCT_IN',
      entityType: 'PRODUCTION',
      entityId: runId,
      itemType: 'PRODUCT',
      itemId: productId,
      qty: quantityProduced,
      locationId,
      userId,
      occurredAt: new Date(completedAt)
    }, { transaction: t });

    await t.commit();

    // Log audit
    const productData = product.get() as any;
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'PRODUCTION',
      entityId: runId,
      description: `Created production run for ${productData.name} (qty: ${quantityProduced})`,
      metadata: { productId, quantityProduced, locationId }
    });

    // Fetch the complete production run with all related data
    const result = await sequelize.models.ProductionRun.findByPk(runId, {
      include: [{ model: sequelize.models.Product }]
    });

    res.status(201).json(result);
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to create production run' });
  }
};

export const deleteProductionRun = async (req: Request, res: Response) => {
  try {
    const run = await sequelize.models.ProductionRun.findByPk(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Production run not found' });
    }

    // Note: This doesn't delete inventory transactions to maintain audit trail
    await run.destroy();
    res.json({ message: 'Production run deleted successfully (inventory transactions preserved)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete production run' });
  }
};
