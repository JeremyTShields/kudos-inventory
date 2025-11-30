import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getBomByProductId,
  createBomItem,
  updateBomItem,
  deleteBomItem
} from '../controllers/bom.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/product/:productId', getBomByProductId);
router.post('/', createBomItem);
router.put('/:id', updateBomItem);
router.delete('/:id', deleteBomItem);

export default router;
