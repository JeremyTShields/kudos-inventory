import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBomByParent,
  createBomItem,
  updateBomItem,
  deleteBomItem
} from '../controllers/bom.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// /bom/product/:id and /bom/wip/:id both resolve through the same handler
router.get('/:parentType/:parentId', getBomByParent);
router.post('/', createBomItem);
router.put('/:id', updateBomItem);
router.delete('/:id', deleteBomItem);

export default router;
