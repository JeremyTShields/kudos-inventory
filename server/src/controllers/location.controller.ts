import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

export const getAllLocations = async (req: Request, res: Response) => {
  try {
    const locations = await sequelize.models.Location.findAll({ order: [['code', 'ASC']] });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
};

export const getLocationById = async (req: Request, res: Response) => {
  try {
    const location = await sequelize.models.Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch location' });
  }
};

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { code, description } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Location code is required' });
    }

    const location = await sequelize.models.Location.create({
      code,
      description: description || ''
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: 'LOCATION',
      entityId: location.get('id') as number,
      description: `Created location ${code}`,
      metadata: { code, description }
    });

    res.status(201).json(location);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Location code already exists' });
    }
    res.status(500).json({ error: 'Failed to create location' });
  }
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const location = await sequelize.models.Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const { code, description } = req.body;
    await location.update({
      ...(code !== undefined && { code }),
      ...(description !== undefined && { description })
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: 'LOCATION',
      entityId: location.get('id') as number,
      description: `Updated location ${location.get('code')}`,
      metadata: { code, description }
    });

    res.json(location);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Location code already exists' });
    }
    res.status(500).json({ error: 'Failed to update location' });
  }
};

export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const location = await sequelize.models.Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const locationId = location.get('id') as number;
    const locationCode = location.get('code') as string;

    // A location referenced by inventory history cannot be removed, or its
    // stock records would point at nothing
    const txnCount = await sequelize.models.InventoryTxn.count({ where: { locationId } });
    if (txnCount > 0) {
      return res.status(409).json({ error: 'Location has inventory history and cannot be deleted' });
    }

    await location.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'LOCATION',
      entityId: locationId,
      description: `Deleted location ${locationCode}`
    });

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
};
