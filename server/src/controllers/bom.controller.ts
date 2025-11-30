import { Request, Response } from 'express';
import { sequelize } from '../config/db';

export const getBomByProductId = async (req: Request, res: Response) => {
  try {
    const bomItems = await sequelize.models.BomItem.findAll({
      where: { productId: req.params.productId },
      include: [
        { model: sequelize.models.Material },
        { model: sequelize.models.Product }
      ]
    });
    res.json(bomItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BOM items' });
  }
};

export const createBomItem = async (req: Request, res: Response) => {
  try {
    const { productId, materialId, qtyPerUnit } = req.body;

    if (!productId || !materialId || !qtyPerUnit) {
      return res.status(400).json({ error: 'Product ID, Material ID, and quantity per unit are required' });
    }

    // Verify product and material exist
    const product = await sequelize.models.Product.findByPk(productId);
    const material = await sequelize.models.Material.findByPk(materialId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const bomItem = await sequelize.models.BomItem.create({
      productId,
      materialId,
      qtyPerUnit
    });

    const result = await sequelize.models.BomItem.findByPk(bomItem.get('id') as number, {
      include: [
        { model: sequelize.models.Material },
        { model: sequelize.models.Product }
      ]
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create BOM item' });
  }
};

export const updateBomItem = async (req: Request, res: Response) => {
  try {
    const bomItem = await sequelize.models.BomItem.findByPk(req.params.id);
    if (!bomItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    const { qtyPerUnit } = req.body;
    if (qtyPerUnit === undefined) {
      return res.status(400).json({ error: 'Quantity per unit is required' });
    }

    await bomItem.update({ qtyPerUnit });

    const result = await sequelize.models.BomItem.findByPk(req.params.id, {
      include: [
        { model: sequelize.models.Material },
        { model: sequelize.models.Product }
      ]
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update BOM item' });
  }
};

export const deleteBomItem = async (req: Request, res: Response) => {
  try {
    const bomItem = await sequelize.models.BomItem.findByPk(req.params.id);
    if (!bomItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    await bomItem.destroy();
    res.json({ message: 'BOM item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete BOM item' });
  }
};
