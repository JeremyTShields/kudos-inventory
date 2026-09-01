import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllOperations,
  getOperationById,
  createOperation,
  updateOperation,
  deleteOperation
} from '../controllers/operation.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllOperations);
router.get('/:id', getOperationById);
router.post('/', createOperation);
router.put('/:id', updateOperation);
router.delete('/:id', deleteOperation);

export default router;
