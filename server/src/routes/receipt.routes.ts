import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllReceipts,
  getReceiptById,
  createReceipt,
  deleteReceipt
} from '../controllers/receipt.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllReceipts);
router.get('/:id', getReceiptById);
router.post('/', createReceipt);
router.delete('/:id', deleteReceipt);

export default router;
