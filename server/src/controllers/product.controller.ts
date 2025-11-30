import { Request, Response } from 'express';
import { sequelize } from '../config/db';

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    const products = await sequelize.models.Product.findAll({ where, order: [['name', 'ASC']] });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await sequelize.models.Product.findByPk(req.params.id, {
      include: [{
        model: sequelize.models.BomItem,
        include: [sequelize.models.Material]
      }]
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { sku, name, uom } = req.body;

    if (!sku || !name || !uom) {
      return res.status(400).json({ error: 'SKU, name, and UOM are required' });
    }

    const product = await sequelize.models.Product.create({
      sku,
      name,
      uom,
      active: true
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await sequelize.models.Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { sku, name, uom, active } = req.body;
    await product.update({
      ...(sku !== undefined && { sku }),
      ...(name !== undefined && { name }),
      ...(uom !== undefined && { uom }),
      ...(active !== undefined && { active })
    });

    res.json(product);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await sequelize.models.Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete by marking as inactive
    await product.update({ active: false });
    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};