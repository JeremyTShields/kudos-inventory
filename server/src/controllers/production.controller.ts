import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { Transaction } from 'sequelize';
import { logAudit } from '../services/auditLog';
import {
  LotError,
  allocateLots,
  generateSerials,
  getOrCreateLot,
  modelForItemType,
  requireIntegerQty,
  validateManualLot,
  ItemType
} from '../services/lots';

const OUTPUT_TYPES = ['PRODUCT', 'WIP'];

/** Attach the produced item (Product or WipItem) to each run under the matching key. */
async function enrichRuns(runs: any[]) {
  return Promise.all(runs.map(async run => {
    const data = run.get({ plain: true });
    const outputType = data.outputType || 'PRODUCT';
    const item = await modelForItemType(outputType as ItemType).findByPk(data.productId);
    if (outputType === 'PRODUCT') {
      data.Product = item;
    } else {
      data.WipItem = item;
    }
    return data;
  }));
}

export const getAllProductionRuns = async (req: Request, res: Response) => {
  try {
    const runs = await sequelize.models.ProductionRun.findAll({
      order: [['startedAt', 'DESC']],
      include: [{ model: sequelize.models.WorkStation }]
    });
    res.json(await enrichRuns(runs));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production runs' });
  }
};

export const getProductionRunById = async (req: Request, res: Response) => {
  try {
    const run = await sequelize.models.ProductionRun.findByPk(req.params.id, {
      include: [{ model: sequelize.models.WorkStation }]
    });
    if (!run) {
      return res.status(404).json({ error: 'Production run not found' });
    }
    const [result] = await enrichRuns([run]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production run' });
  }
};

export const createProductionRun = async (req: Request, res: Response) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const {
      productId, quantityProduced, locationId, workStationId,
      startedAt, completedAt, notes,
      outputLotNumber, serialNumbers, componentLots
    } = req.body;
    const outputType = req.body.outputType || 'PRODUCT';
    const userId = req.user!.sub;

    if (!productId || !quantityProduced || !locationId || !startedAt || !completedAt) {
      await t.rollback();
      return res.status(400).json({
        error: 'Product ID, quantity produced, location, start time, and completion time are required'
      });
    }
    if (!OUTPUT_TYPES.includes(outputType)) {
      await t.rollback();
      return res.status(400).json({ error: 'Output type must be PRODUCT or WIP' });
    }

    // Verify output item and location exist
    const outputItem = await modelForItemType(outputType as ItemType).findByPk(productId);
    const location = await sequelize.models.Location.findByPk(locationId);

    if (!outputItem) {
      await t.rollback();
      return res.status(404).json({ error: outputType === 'PRODUCT' ? 'Product not found' : 'WIP item not found' });
    }
    if (!location) {
      await t.rollback();
      return res.status(404).json({ error: 'Location not found' });
    }

    // Optionally record which work station the run was performed at
    if (workStationId) {
      const workStation = await sequelize.models.WorkStation.findByPk(workStationId);
      if (!workStation) {
        await t.rollback();
        return res.status(404).json({ error: 'Work station not found' });
      }
    }

    const producedQty = parseFloat(quantityProduced);

    // Create production run
    const productionRun = await sequelize.models.ProductionRun.create({
      outputType,
      productId,
      quantityProduced,
      userId,
      workStationId: workStationId || null,
      startedAt: new Date(startedAt),
      completedAt: new Date(completedAt),
      notes: notes || ''
    }, { transaction: t });

    const runId = productionRun.get('id') as number;
    const occurredAt = new Date(completedAt);

    // Consume BOM components (materials or WIP), honoring each
    // component's tracking mode
    const bomItems = await sequelize.models.BomItem.findAll({
      where: { parentType: outputType, parentId: productId },
      transaction: t
    });

    for (const bomItem of bomItems) {
      const componentType = bomItem.get('componentType') as ItemType;
      const componentId = bomItem.get('componentId') as number;
      const required = parseFloat(bomItem.get('qtyPerUnit') as string) * producedQty;
      const consumeTxnType = componentType === 'MATERIAL' ? 'MATERIAL_CONSUME' : 'WIP_CONSUME';

      const component = await modelForItemType(componentType).findByPk(componentId, { transaction: t });
      if (!component) {
        throw new LotError(`BOM component ${componentType} #${componentId} not found`, 404);
      }

      const baseTxn = {
        txnType: consumeTxnType,
        entityType: 'PRODUCTION',
        entityId: runId,
        itemType: componentType,
        itemId: componentId,
        locationId,
        userId,
        occurredAt
      };

      if (component.get('trackingType') === 'NONE') {
        await sequelize.models.InventoryTxn.create({
          ...baseTxn,
          qty: -required
        }, { transaction: t });
      } else if (component.get('lotPicking') === 'FIFO') {
        const allocations = await allocateLots(componentType, componentId, locationId, required, t);
        for (const allocation of allocations) {
          await sequelize.models.InventoryTxn.create({
            ...baseTxn,
            qty: -allocation.qty,
            lotId: allocation.lotId
          }, { transaction: t });
        }
      } else {
        // MANUAL picking: the request must name the lots to consume
        const picks = (Array.isArray(componentLots) ? componentLots : []).filter((pick: any) =>
          pick.componentType === componentType && Number(pick.componentId) === Number(componentId));
        const pickedTotal = picks.reduce((sum: number, pick: any) => sum + parseFloat(pick.qty), 0);
        if (Math.abs(pickedTotal - required) > 1e-6) {
          throw new LotError(`${component.get('sku')} uses manual lot picking: specify lots covering ${required}`);
        }
        for (const pick of picks) {
          const pickQty = parseFloat(pick.qty);
          await validateManualLot(componentType, componentId, locationId, Number(pick.lotId), pickQty, t);
          await sequelize.models.InventoryTxn.create({
            ...baseTxn,
            qty: -pickQty,
            lotId: Number(pick.lotId)
          }, { transaction: t });
        }
      }
    }

    // Produce the output, honoring its tracking mode
    const outputTxnType = outputType === 'PRODUCT' ? 'PRODUCT_IN' : 'WIP_IN';
    const outputBase = {
      txnType: outputTxnType,
      entityType: 'PRODUCTION',
      entityId: runId,
      itemType: outputType,
      itemId: productId,
      locationId,
      userId,
      occurredAt
    };

    const outputTracking = outputItem.get('trackingType') as string;
    if (outputTracking === 'NONE') {
      await sequelize.models.InventoryTxn.create({
        ...outputBase,
        qty: quantityProduced
      }, { transaction: t });
    } else if (outputTracking === 'LOT') {
      if (!outputLotNumber) {
        throw new LotError(`${outputItem.get('sku')} is lot-tracked: outputLotNumber is required`);
      }
      const lot = await getOrCreateLot(outputType as ItemType, Number(productId), outputLotNumber, t);
      await sequelize.models.InventoryTxn.create({
        ...outputBase,
        qty: quantityProduced,
        lotId: lot.get('id') as number
      }, { transaction: t });
    } else {
      const count = requireIntegerQty(producedQty, 'Quantity produced');
      let serials: string[];
      if (Array.isArray(serialNumbers) && serialNumbers.length > 0) {
        if (serialNumbers.length !== count || new Set(serialNumbers).size !== count) {
          throw new LotError(`Provide ${count} unique serial numbers (got ${serialNumbers.length})`);
        }
        serials = serialNumbers;
      } else {
        serials = await generateSerials(outputItem, count, t);
      }
      for (const serial of serials) {
        const existing = await sequelize.models.Lot.findOne({
          where: { itemType: outputType, itemId: productId, lotNumber: serial },
          transaction: t
        });
        if (existing) {
          throw new LotError(`Serial ${serial} already exists for ${outputItem.get('sku')}`);
        }
        const lot = await sequelize.models.Lot.create({
          itemType: outputType,
          itemId: productId,
          lotNumber: serial
        }, { transaction: t });
        await sequelize.models.InventoryTxn.create({
          ...outputBase,
          qty: 1,
          lotId: lot.get('id') as number
        }, { transaction: t });
      }
    }

    await t.commit();

    // Log audit
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'PRODUCTION',
      entityId: runId,
      description: `Created production run for ${outputItem.get('name')} (qty: ${quantityProduced})`,
      metadata: { outputType, productId, quantityProduced, locationId, workStationId }
    });

    // Fetch the complete production run with all related data
    const result = await sequelize.models.ProductionRun.findByPk(runId, {
      include: [{ model: sequelize.models.WorkStation }]
    });
    const [enriched] = await enrichRuns([result]);

    res.status(201).json(enriched);
  } catch (error) {
    await t.rollback();
    if (error instanceof LotError) {
      return res.status(error.status).json({ error: error.message });
    }
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
