import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getCurrentStock,
  getStockByItem,
  getTransactionHistory,
  getLowStockMaterials,
  getUserActivity,
  createInventoryAdjustment
} from '../controllers/inventory.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/stock', getCurrentStock);
router.get('/stock/:itemType/:itemId', getStockByItem);
router.get('/transactions', getTransactionHistory);
router.get('/low-stock', getLowStockMaterials);
router.get('/user-activity', getUserActivity);

// Admin-only routes
router.post('/adjust', requireRole('ADMIN'), createInventoryAdjustment);

export default router;
