import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllTransfers,
  getTransferById,
  createTransfer,
  deleteTransfer
} from '../controllers/transfer.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllTransfers);
router.get('/:id', getTransferById);
router.post('/', createTransfer);
router.delete('/:id', deleteTransfer);

export default router;
