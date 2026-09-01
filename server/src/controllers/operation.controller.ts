import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

export const getAllOperations = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    const where: any = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    const operations = await sequelize.models.Operation.findAll({
      where,
      order: [['code', 'ASC']],
      include: [{ model: sequelize.models.WorkStation }]
    });
    res.json(operations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
};

export const getOperationById = async (req: Request, res: Response) => {
  try {
    const operation = await sequelize.models.Operation.findByPk(req.params.id, {
      include: [{ model: sequelize.models.WorkStation }]
    });
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch operation' });
  }
};

export const createOperation = async (req: Request, res: Response) => {
  try {
    const { code, name, description, workStationId } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    if (workStationId) {
      const station = await sequelize.models.WorkStation.findByPk(workStationId);
      if (!station) {
        return res.status(404).json({ error: 'Work station not found' });
      }
    }

    const operation = await sequelize.models.Operation.create({
      code,
      name,
      description: description || '',
      workStationId: workStationId || null,
      active: true
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: 'OPERATION',
      entityId: operation.get('id') as number,
      description: `Created operation ${code} (${name})`,
      metadata: { code, name, description, workStationId }
    });

    const result = await sequelize.models.Operation.findByPk(operation.get('id') as number, {
      include: [{ model: sequelize.models.WorkStation }]
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Operation code already exists' });
    }
    res.status(500).json({ error: 'Failed to create operation' });
  }
};

export const updateOperation = async (req: Request, res: Response) => {
  try {
    const operation = await sequelize.models.Operation.findByPk(req.params.id);
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const { code, name, description, workStationId, active } = req.body;

    if (workStationId) {
      const station = await sequelize.models.WorkStation.findByPk(workStationId);
      if (!station) {
        return res.status(404).json({ error: 'Work station not found' });
      }
    }

    await operation.update({
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(workStationId !== undefined && { workStationId: workStationId || null }),
      ...(active !== undefined && { active })
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: 'OPERATION',
      entityId: operation.get('id') as number,
      description: `Updated operation ${operation.get('code')}`,
      metadata: { code, name, description, workStationId, active }
    });

    const result = await sequelize.models.Operation.findByPk(req.params.id, {
      include: [{ model: sequelize.models.WorkStation }]
    });

    res.json(result);
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Operation code already exists' });
    }
    res.status(500).json({ error: 'Failed to update operation' });
  }
};

export const deleteOperation = async (req: Request, res: Response) => {
  try {
    const operation = await sequelize.models.Operation.findByPk(req.params.id);
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Soft delete by marking as inactive
    await operation.update({ active: false });

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'OPERATION',
      entityId: operation.get('id') as number,
      description: `Deactivated operation ${operation.get('code')}`
    });

    res.json({ message: 'Operation deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete operation' });
  }
};
