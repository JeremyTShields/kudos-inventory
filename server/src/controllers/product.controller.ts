import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

const TRACKING_TYPES = ['NONE', 'LOT', 'SERIAL'];
const LOT_PICKING = ['FIFO', 'MANUAL'];

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
    const product = await sequelize.models.Product.findByPk(req.params.id);
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
    const { sku, name, uom, trackingType, lotPicking, serialPrefix, serialNextSeq } = req.body;

    if (!sku || !name || !uom) {
      return res.status(400).json({ error: 'SKU, name, and UOM are required' });
    }
    if (trackingType && !TRACKING_TYPES.includes(trackingType)) {
      return res.status(400).json({ error: 'Tracking type must be NONE, LOT, or SERIAL' });
    }
    if (lotPicking && !LOT_PICKING.includes(lotPicking)) {
      return res.status(400).json({ error: 'Lot picking must be FIFO or MANUAL' });
    }

    const product = await sequelize.models.Product.create({
      sku,
      name,
      uom,
      trackingType: trackingType || 'NONE',
      lotPicking: lotPicking || 'FIFO',
      ...(serialPrefix !== undefined && { serialPrefix }),
      ...(serialNextSeq !== undefined && { serialNextSeq }),
      active: true
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: product.get('id') as number,
      description: `Created product ${sku} (${name})`,
      metadata: { sku, name, uom }
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

    const { sku, name, uom, trackingType, lotPicking, serialPrefix, serialNextSeq, active } = req.body;

    if (trackingType && !TRACKING_TYPES.includes(trackingType)) {
      return res.status(400).json({ error: 'Tracking type must be NONE, LOT, or SERIAL' });
    }
    if (lotPicking && !LOT_PICKING.includes(lotPicking)) {
      return res.status(400).json({ error: 'Lot picking must be FIFO or MANUAL' });
    }

    await product.update({
      ...(sku !== undefined && { sku }),
      ...(name !== undefined && { name }),
      ...(uom !== undefined && { uom }),
      ...(trackingType !== undefined && { trackingType }),
      ...(lotPicking !== undefined && { lotPicking }),
      ...(serialPrefix !== undefined && { serialPrefix }),
      ...(serialNextSeq !== undefined && { serialNextSeq }),
      ...(active !== undefined && { active })
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: 'PRODUCT',
      entityId: product.get('id') as number,
      description: `Updated product ${product.get('sku')}`,
      metadata: { sku, name, uom, active }
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

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'PRODUCT',
      entityId: product.get('id') as number,
      description: `Deactivated product ${product.get('sku')}`
    });

    res.json({ message: 'Product deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};