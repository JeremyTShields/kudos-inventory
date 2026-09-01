import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllWipItems,
  getWipItemById,
  createWipItem,
  updateWipItem,
  deleteWipItem
} from '../controllers/wipItem.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllWipItems);
router.get('/:id', getWipItemById);
router.post('/', createWipItem);
router.put('/:id', updateWipItem);
router.delete('/:id', deleteWipItem);

export default router;
