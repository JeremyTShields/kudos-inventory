import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

export const getAllWorkStations = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    const stations = await sequelize.models.WorkStation.findAll({ where, order: [['code', 'ASC']] });
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work stations' });
  }
};

export const getWorkStationById = async (req: Request, res: Response) => {
  try {
    const station = await sequelize.models.WorkStation.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Work station not found' });
    }
    res.json(station);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch work station' });
  }
};

export const createWorkStation = async (req: Request, res: Response) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const station = await sequelize.models.WorkStation.create({
      code,
      name,
      description: description || '',
      active: true
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: 'WORK_STATION',
      entityId: station.get('id') as number,
      description: `Created work station ${code} (${name})`,
      metadata: { code, name, description }
    });

    res.status(201).json(station);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Work station code already exists' });
    }
    res.status(500).json({ error: 'Failed to create work station' });
  }
};

export const updateWorkStation = async (req: Request, res: Response) => {
  try {
    const station = await sequelize.models.WorkStation.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Work station not found' });
    }

    const { code, name, description, active } = req.body;
    await station.update({
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(active !== undefined && { active })
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: 'WORK_STATION',
      entityId: station.get('id') as number,
      description: `Updated work station ${station.get('code')}`,
      metadata: { code, name, description, active }
    });

    res.json(station);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Work station code already exists' });
    }
    res.status(500).json({ error: 'Failed to update work station' });
  }
};

export const deleteWorkStation = async (req: Request, res: Response) => {
  try {
    const station = await sequelize.models.WorkStation.findByPk(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Work station not found' });
    }

    // Soft delete by marking as inactive
    await station.update({ active: false });

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'WORK_STATION',
      entityId: station.get('id') as number,
      description: `Deactivated work station ${station.get('code')}`
    });

    res.json({ message: 'Work station deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete work station' });
  }
};
