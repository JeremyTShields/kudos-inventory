import { Request, Response } from 'express';
import { sequelize } from '../config/db';
import { logAudit } from '../services/auditLog';

const PARENT_TYPES = ['PRODUCT', 'WIP'];
const COMPONENT_TYPES = ['MATERIAL', 'WIP'];

const parentModel = (parentType: string) =>
  parentType === 'PRODUCT' ? sequelize.models.Product : sequelize.models.WipItem;

const componentModel = (componentType: string) =>
  componentType === 'MATERIAL' ? sequelize.models.Material : sequelize.models.WipItem;

/** URL segment ('product' | 'wip') to the stored parent type. */
function normalizeParentType(raw: string): string | null {
  const upper = String(raw || '').toUpperCase();
  if (upper === 'PRODUCT') return 'PRODUCT';
  if (upper === 'WIP') return 'WIP';
  return null;
}

/** Attach the component row (Material or WipItem) to each BOM item as `Component`. */
async function enrichWithComponents(bomItems: any[]) {
  return Promise.all(bomItems.map(async item => {
    const data = item.get();
    const component = await componentModel(data.componentType).findByPk(data.componentId);
    return { ...data, Component: component };
  }));
}

export const getBomByParent = async (req: Request, res: Response) => {
  try {
    const parentType = normalizeParentType(req.params.parentType);
    if (!parentType) {
      return res.status(400).json({ error: 'Parent type must be product or wip' });
    }

    const bomItems = await sequelize.models.BomItem.findAll({
      where: { parentType, parentId: req.params.parentId }
    });
    res.json(await enrichWithComponents(bomItems));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch BOM items' });
  }
};

export const createBomItem = async (req: Request, res: Response) => {
  try {
    // Legacy body shape (productId/materialId) still maps onto the
    // generalized parent/component fields
    const parentType = req.body.parentType || 'PRODUCT';
    const parentId = req.body.parentId ?? req.body.productId;
    const componentType = req.body.componentType || 'MATERIAL';
    const componentId = req.body.componentId ?? req.body.materialId;
    const { qtyPerUnit } = req.body;

    if (!parentId || !componentId || !qtyPerUnit) {
      return res.status(400).json({ error: 'Parent, component, and quantity per unit are required' });
    }
    if (!PARENT_TYPES.includes(parentType)) {
      return res.status(400).json({ error: 'Parent type must be PRODUCT or WIP' });
    }
    if (!COMPONENT_TYPES.includes(componentType)) {
      return res.status(400).json({ error: 'Component type must be MATERIAL or WIP' });
    }
    if (parentType === 'WIP' && componentType === 'WIP' && Number(parentId) === Number(componentId)) {
      return res.status(400).json({ error: 'A WIP item cannot be a component of itself' });
    }

    const parent = await parentModel(parentType).findByPk(parentId);
    if (!parent) {
      return res.status(404).json({ error: `${parentType === 'PRODUCT' ? 'Product' : 'WIP item'} not found` });
    }
    const component = await componentModel(componentType).findByPk(componentId);
    if (!component) {
      return res.status(404).json({ error: `${componentType === 'MATERIAL' ? 'Material' : 'WIP item'} not found` });
    }

    const bomItem = await sequelize.models.BomItem.create({
      parentType,
      parentId,
      componentType,
      componentId,
      qtyPerUnit
    });

    await logAudit({
      userId: req.user!.sub,
      action: 'CREATE',
      entityType: parentType === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: parent.get('id') as number,
      description: `Added ${componentType.toLowerCase()} ${component.get('sku')} (qty/unit ${qtyPerUnit}) to BOM of ${parent.get('sku')}`,
      metadata: { parentType, parentId, componentType, componentId, qtyPerUnit }
    });

    const [result] = await enrichWithComponents([bomItem]);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create BOM item' });
  }
};

export const updateBomItem = async (req: Request, res: Response) => {
  try {
    const bomItem = await sequelize.models.BomItem.findByPk(req.params.id);
    if (!bomItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    const { qtyPerUnit } = req.body;
    if (qtyPerUnit === undefined) {
      return res.status(400).json({ error: 'Quantity per unit is required' });
    }

    await bomItem.update({ qtyPerUnit });

    await logAudit({
      userId: req.user!.sub,
      action: 'UPDATE',
      entityType: bomItem.get('parentType') === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: bomItem.get('parentId') as number,
      description: `Updated BOM item #${bomItem.get('id')} of ${String(bomItem.get('parentType')).toLowerCase()} #${bomItem.get('parentId')} to qty/unit ${qtyPerUnit}`,
      metadata: { qtyPerUnit }
    });

    const [result] = await enrichWithComponents([bomItem]);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update BOM item' });
  }
};

export const deleteBomItem = async (req: Request, res: Response) => {
  try {
    const bomItem = await sequelize.models.BomItem.findByPk(req.params.id);
    if (!bomItem) {
      return res.status(404).json({ error: 'BOM item not found' });
    }

    const parentType = bomItem.get('parentType') as string;
    const parentId = bomItem.get('parentId') as number;
    await bomItem.destroy();

    await logAudit({
      userId: req.user!.sub,
      action: 'DELETE',
      entityType: parentType === 'PRODUCT' ? 'PRODUCT' : 'WIP_ITEM',
      entityId: parentId,
      description: `Removed BOM item #${req.params.id} from ${parentType.toLowerCase()} #${parentId}`
    });

    res.json({ message: 'BOM item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete BOM item' });
  }
};
