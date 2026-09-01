import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

const TRACKING_TYPES = ['NONE', 'LOT', 'SERIAL'];
const LOT_PICKING = ['FIFO', 'MANUAL'];

export const getAllWipItems = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    const items = await sequelize.models.WipItem.findAll({ where, order: [['name', 'ASC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch WIP items' });
  }
};

export const getWipItemById = async (req: Request, res: Response) => {
  try {
    const item = await sequelize.models.WipItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'WIP item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch WIP item' });
  }
};

export const createWipItem = async (req: Request, res: Response) => {
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

    const item = await sequelize.models.WipItem.create({
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
      entityType: 'WIP_ITEM',
      entityId: item.get('id') as number,
      description: `Created WIP item ${sku} (${name})`,
      metadata: { sku, name, uom, trackingType, lotPicking }
    });

    res.status(201).json(item);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to create WIP item' });
  }
};

export const updateWipItem = async (req: Request, res: Response) => {
  try {
    const item = await sequelize.models.WipItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'WIP item not found' });
    }

    const { sku, name, uom, trackingType, lotPicking, serialPrefix, serialNextSeq, active } = req.body;

    if (trackingType && !TRACKING_TYPES.includes(trackingType)) {
      return res.status(400).json({ error: 'Tracking type must be NONE, LOT, or SERIAL' });
    }
    if (lotPicking && !LOT_PICKING.includes(lotPicking)) {
      return res.status(400).json({ error: 'Lot picking must be FIFO or MANUAL' });
    }

    await item.update({
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
      entityType: 'WIP_ITEM',
      entityId: item.get('id') as number,
      description: `Updated WIP item ${item.get('sku')}`,
      metadata: { sku, name, uom, trackingType, lotPicking, active }
    });

    res.json(item);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    res.status(500).json({ error: 'Failed to update WIP item' });
  }
};

export const deleteWipItem = async (req: Request, res: Response) => {
  try {
    const item = await sequelize.models.WipItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'WIP item not found' });
    }

    // Soft delete by marking as inactive
    await item.update({ active: false });

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'WIP_ITEM',
      entityId: item.get('id') as number,
      description: `Deactivated WIP item ${item.get('sku')}`
    });

    res.json({ message: 'WIP item deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete WIP item' });
  }
};
