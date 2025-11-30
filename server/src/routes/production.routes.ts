import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllProductionRuns,
  getProductionRunById,
  createProductionRun,
  deleteProductionRun
} from '../controllers/production.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllProductionRuns);
router.get('/:id', getProductionRunById);
router.post('/', createProductionRun);
router.delete('/:id', deleteProductionRun);

export default router;
