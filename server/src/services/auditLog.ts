import { sequelize } from '../config/db';

interface AuditLogParams {
  userId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  entityType: 'USER' | 'MATERIAL' | 'PRODUCT' | 'LOCATION' | 'RECEIPT' | 'PRODUCTION' | 'SHIPMENT' | 'INVENTORY_ADJUSTMENT';
  entityId?: number;
  description: string;
  metadata?: any;
}

export async function logAudit(params: AuditLogParams) {
  try {
    await sequelize.models.AuditLog.create({
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      description: params.description,
      metadata: params.metadata
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}