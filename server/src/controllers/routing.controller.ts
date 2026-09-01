import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

const routingIncludes = () => [{
  model: sequelize.models.Operation,
  include: [{ model: sequelize.models.WorkStation }]
}];

export const getRoutingByProductId = async (req: Request, res: Response) => {
  try {
    const routing = await sequelize.models.ProductOperation.findAll({
      where: { productId: req.params.productId },
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
    const { productId, operationId, sequence } = req.body;

    if (!productId || !operationId || sequence === undefined || sequence === null || sequence === '') {
      return res.status(400).json({ error: 'Product ID, operation ID, and sequence are required' });
    }

    const product = await sequelize.models.Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const operation = await sequelize.models.Operation.findByPk(operationId);
    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const step = await sequelize.models.ProductOperation.create({
      productId,
      operationId,
      sequence
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: product.get('id') as number,
      description: `Added operation ${operation.get('code')} to routing of ${product.get('sku')} at step ${sequence}`,
      metadata: { productId, operationId, sequence }
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
      entityType: 'PRODUCT',
      entityId: step.get('productId') as number,
      description: `Updated routing step #${step.get('id')} of product #${step.get('productId')}`,
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

    const productId = step.get('productId') as number;
    await step.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: 'PRODUCT',
      entityId: productId,
      description: `Removed routing step #${req.params.id} from product #${productId}`
    });

    res.json({ message: 'Routing step deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete routing step' });
  }
};
