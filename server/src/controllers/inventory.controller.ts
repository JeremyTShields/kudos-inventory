import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { QueryTypes } from 'sequelize';
import { logAudit } from '../services/auditLog';

export const getCurrentStock = async (req: Request, res: Response) => {
  try {
    const { itemType, locationId } = req.query;

    let whereClause = '';
    const replacements: any = {};

    if (itemType) {
      whereClause += ' AND itemType = :itemType';
      replacements.itemType = itemType;
    }

    if (locationId) {
      whereClause += ' AND locationId = :locationId';
      replacements.locationId = locationId;
    }

    // Calculate current stock by summing all transactions
    const query = `
      SELECT
        itemType,
        itemId,
        locationId,
        SUM(qty) as currentStock
      FROM inventory_txns
      WHERE 1=1 ${whereClause}
      GROUP BY itemType, itemId, locationId
      HAVING SUM(qty) != 0
      ORDER BY itemType, itemId, locationId
    `;

    const stockLevels = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    // Enrich with item and location details
    const enrichedStock = await Promise.all(
      stockLevels.map(async (stock: any) => {
        let itemDetails = null;
        let locationDetails = null;

        if (stock.itemType === 'MATERIAL') {
          itemDetails = await sequelize.models.Material.findByPk(stock.itemId);
        } else if (stock.itemType === 'PRODUCT') {
          itemDetails = await sequelize.models.Product.findByPk(stock.itemId);
        }

        locationDetails = await sequelize.models.Location.findByPk(stock.locationId);

        return {
          ...stock,
          item: itemDetails,
          location: locationDetails
        };
      })
    );

    res.json(enrichedStock);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch current stock' });
  }
};

export const getStockByItem = async (req: Request, res: Response) => {
  try {
    const { itemType, itemId } = req.params;

    if (!['MATERIAL', 'PRODUCT'].includes(itemType)) {
      return res.status(400).json({ error: 'Item type must be MATERIAL or PRODUCT' });
    }

    const query = `
      SELECT
        locationId,
        SUM(qty) as currentStock
      FROM inventory_txns
      WHERE itemType = :itemType AND itemId = :itemId
      GROUP BY locationId
      HAVING SUM(qty) != 0
      ORDER BY locationId
    `;

    const stockLevels = await sequelize.query(query, {
      replacements: { itemType, itemId },
      type: QueryTypes.SELECT
    });

    // Enrich with location details
    const enrichedStock = await Promise.all(
      stockLevels.map(async (stock: any) => {
        const locationDetails = await sequelize.models.Location.findByPk(stock.locationId);
        return {
          ...stock,
          location: locationDetails
        };
      })
    );

    // Get item details
    let itemDetails = null;
    if (itemType === 'MATERIAL') {
      itemDetails = await sequelize.models.Material.findByPk(itemId);
    } else {
      itemDetails = await sequelize.models.Product.findByPk(itemId);
    }

    res.json({
      itemType,
      item: itemDetails,
      stockByLocation: enrichedStock,
      totalStock: enrichedStock.reduce((sum, s: any) => sum + parseFloat(s.currentStock), 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stock for item' });
  }
};

export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { itemType, itemId, locationId, startDate, endDate, limit } = req.query;

    const where: any = {};

    if (itemType) where.itemType = itemType;
    if (itemId) where.itemId = itemId;
    if (locationId) where.locationId = locationId;
    if (startDate) {
      where.occurredAt = { ...where.occurredAt, $gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.occurredAt = { ...where.occurredAt, $lte: new Date(endDate as string) };
    }

    const transactions = await sequelize.models.InventoryTxn.findAll({
      where,
      order: [['occurredAt', 'DESC']],
      limit: limit ? parseInt(limit as string) : 100
    });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
};

export const getLowStockMaterials = async (req: Request, res: Response) => {
  try {
    // Get all materials with their min stock levels
    const materials = await sequelize.models.Material.findAll({
      where: { active: true }
    });

    const lowStockItems = [];

    for (const material of materials) {
      const materialData = material.get() as any;
      const minStock = parseFloat(materialData.minStock) || 0;

      // Calculate current stock across all locations
      const query = `
        SELECT SUM(qty) as totalStock
        FROM inventory_txns
        WHERE itemType = 'MATERIAL' AND itemId = :itemId
      `;

      const result: any = await sequelize.query(query, {
        replacements: { itemId: materialData.id },
        type: QueryTypes.SELECT
      });

      const totalStock = result[0]?.totalStock ? parseFloat(result[0].totalStock) : 0;

      if (totalStock < minStock) {
        lowStockItems.push({
          material: materialData,
          currentStock: totalStock,
          minStock: minStock,
          deficit: minStock - totalStock
        });
      }
    }

    res.json(lowStockItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch low stock materials' });
  }
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (startDate) {
      where.occurredAt = { ...where.occurredAt, $gte: new Date(startDate as string) };
    }
    if (endDate) {
      where.occurredAt = { ...where.occurredAt, $lte: new Date(endDate as string) };
    }

    const transactions = await sequelize.models.InventoryTxn.findAll({
      where,
      order: [['occurredAt', 'DESC']],
      limit: 100
    });

    // Group by user and transaction type
    const activitySummary = transactions.reduce((acc: any, txn: any) => {
      const userId = txn.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          totalTransactions: 0,
          byType: {}
        };
      }
      acc[userId].totalTransactions++;
      const txnType = txn.txnType;
      acc[userId].byType[txnType] = (acc[userId].byType[txnType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      transactions,
      summary: Object.values(activitySummary)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

export const createInventoryAdjustment = async (req: Request, res: Response) => {
  try {
    const { itemType, itemId, locationId, qty, notes } = req.body;
    const userId = (req as any).user.sub;

    if (!itemType || !itemId || !locationId || qty === undefined) {
      return res.status(400).json({
        error: 'Item type, item ID, location ID, and quantity are required'
      });
    }

    if (!['MATERIAL', 'PRODUCT'].includes(itemType)) {
      return res.status(400).json({ error: 'Item type must be MATERIAL or PRODUCT' });
    }

    // Verify item exists
    if (itemType === 'MATERIAL') {
      const material = await sequelize.models.Material.findByPk(itemId);
      if (!material) {
        return res.status(404).json({ error: 'Material not found' });
      }
    } else {
      const product = await sequelize.models.Product.findByPk(itemId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
    }

    // Verify location exists
    const location = await sequelize.models.Location.findByPk(locationId);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Create inventory adjustment transaction
    const adjustment = await sequelize.models.InventoryTxn.create({
      txnType: 'ADJUST',
      entityType: 'ADJUSTMENT',
      entityId: null,
      itemType,
      itemId,
      qty: parseFloat(qty),
      locationId,
      userId,
      occurredAt: new Date(),
      notes: notes || 'Manual inventory adjustment'
    });

    // Log audit
    const adjustmentId = adjustment.get('id') as number;
    await logAudit({
      userId,
      action: 'CREATE',
      entityType: 'INVENTORY_ADJUSTMENT',
      entityId: adjustmentId,
      description: `Manual inventory adjustment: ${itemType} #${itemId} qty ${qty > 0 ? '+' : ''}${qty}`,
      metadata: { itemType, itemId, locationId, qty, notes }
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create inventory adjustment' });
  }
};
