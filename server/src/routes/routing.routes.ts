import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRoutingByProductId,
  createRoutingStep,
  updateRoutingStep,
  deleteRoutingStep
} from '../controllers/routing.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/product/:productId', getRoutingByProductId);
router.post('/', createRoutingStep);
router.put('/:id', updateRoutingStep);
router.delete('/:id', deleteRoutingStep);

export default router;
