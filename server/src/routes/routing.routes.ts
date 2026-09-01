import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRoutingByParent,
  createRoutingStep,
  updateRoutingStep,
  deleteRoutingStep
} from '../controllers/routing.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// /routing/product/:id and /routing/wip/:id both resolve through the same handler
router.get('/:parentType/:parentId', getRoutingByParent);
router.post('/', createRoutingStep);
router.put('/:id', updateRoutingStep);
router.delete('/:id', deleteRoutingStep);

export default router;
