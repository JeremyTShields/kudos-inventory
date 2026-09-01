import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

const PARENT_TYPES = ['PRODUCT', 'WIP'];

const parentModel = (parentType: string) =>
  parentType === 'PRODUCT' ? sequelize.models.Product : sequelize.models.WipItem;

function normalizeParentType(raw: string): string | null {
  const upper = String(raw || '').toUpperCase();
  if (upper === 'PRODUCT') return 'PRODUCT';
  if (upper === 'WIP') return 'WIP';
  return null;
}

const routingIncludes = () => [{
  model: sequelize.models.Operation,
  include: [{ model: sequelize.models.WorkStation }]
}];

export const getRoutingByParent = async (req: Request, res: Response) => {
  try {
    const parentType = normalizeParentType(req.params.parentType);
    if (!parentType) {
      return res.status(400).json({ error: 'Parent type must be product or wip' });
    }

    const routing = await sequelize.models.ProductOperation.findAll({
      where: { parentType, parentId: req.params.parentId },
      order: [['sequence', 'ASC']],
      include: routingIncludes()
    });
    res.json(routing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch routing' });
  }
};

export const createRoutingStep = async (req: Request, res: Response) => {
  try {
    const parentType = req.body.parentType || 'PRODUCT';
    const parentId = req.body.parentId ?? req.body.productId;
    const { operationId, sequence } = req.body;

    if (!parentId || !operationId || sequence === undefined || sequence === null || sequence === '') {
      return res.status(400).json({ error: 'Parent, operation ID, and sequence are required' });
    }
    if (!PARENT_TYPES.includes(parentType)) {
      return res.status(400).json({ error: 'Parent type must be PRODUCT or WIP' });
    }

    const parent = await parentModel(parentType).findByPk(parentId);
    if (!parent) {
      return res.status(404).json({ error: `${parentType === 'PRODUCT' ? 'Product' : 'WIP item'} not found` });
    }
    const operation = await sequelize.models.Operation.findByPk(operationId);
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const step = await sequelize.models.ProductOperation.create({
      parentType,
      parentId,
      operationId,
      sequence
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: parentType === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: parent.get('id') as number,
      description: `Added operation ${operation.get('code')} to routing of ${parent.get('sku')} at step ${sequence}`,
      metadata: { parentType, parentId, operationId, sequence }
    });

    const result = await sequelize.models.ProductOperation.findByPk(step.get('id') as number, {
      include: routingIncludes()
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create routing step' });
  }
};

export const updateRoutingStep = async (req: Request, res: Response) => {
  try {
    const step = await sequelize.models.ProductOperation.findByPk(req.params.id);
    if (!step) {
      return res.status(404).json({ error: 'Routing step not found' });
    }

    const { operationId, sequence } = req.body;

    if (operationId) {
      const operation = await sequelize.models.Operation.findByPk(operationId);
      if (!operation) {
        return res.status(404).json({ error: 'Operation not found' });
      }
    }

    await step.update({
      ...(operationId !== undefined && { operationId }),
      ...(sequence !== undefined && { sequence })
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: step.get('parentType') === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: step.get('parentId') as number,
      description: `Updated routing step #${step.get('id')} of ${String(step.get('parentType')).toLowerCase()} #${step.get('parentId')}`,
      metadata: { operationId, sequence }
    });

    const result = await sequelize.models.ProductOperation.findByPk(req.params.id, {
      include: routingIncludes()
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update routing step' });
  }
};

export const deleteRoutingStep = async (req: Request, res: Response) => {
  try {
    const step = await sequelize.models.ProductOperation.findByPk(req.params.id);
    if (!step) {
      return res.status(404).json({ error: 'Routing step not found' });
    }

    const parentType = step.get('parentType') as string;
    const parentId = step.get('parentId') as number;
    await step.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: parentType === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: parentId,
      description: `Removed routing step #${req.params.id} from ${parentType.toLowerCase()} #${parentId}`
    });

    res.json({ message: 'Routing step deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete routing step' });
  }
};
