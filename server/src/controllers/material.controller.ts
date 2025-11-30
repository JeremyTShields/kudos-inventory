import { Request, Response } from 'express';
import { sequelize } from '../config/db';

export const getAllMaterials = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    const materials = await sequelize.models.Material.findAll({ where, order: [['name', 'ASC']] });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const material = await sequelize.models.Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { sku, name, uom, minStock } = req.body;

    if (!sku || !name || !uom) {
      return res.status(400).json({ error: 'SKU, name, and UOM are required' });
    }

    const material = await sequelize.models.Material.create({
      sku,
      name,
      uom,
      minStock: minStock || 0,
      active: true
    });

    res.status(201).json(material);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create material' });
  }
};

export const updateMaterial = async (req: Request, res: Response) => {
  try {
    const material = await sequelize.models.Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const { sku, name, uom, minStock, active } = req.body;
    await material.update({
      ...(sku !== undefined && { sku }),
      ...(name !== undefined && { name }),
      ...(uom !== undefined && { uom }),
      ...(minStock !== undefined && { minStock }),
      ...(active !== undefined && { active })
    });

    res.json(material);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update material' });
  }
};

export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const material = await sequelize.models.Material.findByPk(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Soft delete by marking as inactive
    await material.update({ active: false });
    res.json({ message: 'Material deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
};