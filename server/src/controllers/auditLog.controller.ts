import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/db';

export const getAllAuditLogs = async (req: Request, res: Response) => {
  try {
    const { action, entityType, userId, startDate, endDate, limit = 100 } = req.query;

    const where: any = {};
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate as string);
    }

    const logs = await sequelize.models.AuditLog.findAll({
      where,
      include: [{ model: sequelize.models.User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit as string)
    });

    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

export const getAuditLogById = async (req: Request, res: Response) => {
  try {
    const log = await sequelize.models.AuditLog.findByPk(req.params.id, {
      include: [{ model: sequelize.models.User, attributes: ['id', 'name', 'email'] }]
    });

    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

export const getAuditStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate as string);
    }

    const logs = await sequelize.models.AuditLog.findAll({ where });

    // Calculate statistics
    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
      byUser: {} as Record<number, { name: string; count: number }>
    };

    // Look up all referenced users in one query
    const userIds = [...new Set(logs.map(log => (log.get() as any).userId))];
    const users = await sequelize.models.User.findAll({ where: { id: { [Op.in]: userIds } } });
    const userNames = new Map<number, string>(
      users.map(user => {
        const userData = user.get() as any;
        return [userData.id, userData.name];
      })
    );

    for (const log of logs) {
      const logData = log.get() as any;

      // Count by action
      stats.byAction[logData.action] = (stats.byAction[logData.action] || 0) + 1;

      // Count by entity type
      stats.byEntityType[logData.entityType] = (stats.byEntityType[logData.entityType] || 0) + 1;

      // Count by user
      if (!stats.byUser[logData.userId]) {
        stats.byUser[logData.userId] = { name: userNames.get(logData.userId) || 'Unknown', count: 0 };
      }
      stats.byUser[logData.userId].count++;
    }

    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit stats' });
  }
};