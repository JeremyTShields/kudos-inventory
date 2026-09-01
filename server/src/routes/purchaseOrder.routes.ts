import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder
} from '../controllers/purchaseOrder.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.post('/', createPurchaseOrder);
router.put('/:id/status', updatePurchaseOrderStatus);
router.delete('/:id', deletePurchaseOrder);

export default router;
