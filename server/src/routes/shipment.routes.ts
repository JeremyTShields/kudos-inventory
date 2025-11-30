import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllShipments,
  getShipmentById,
  createShipment,
  deleteShipment
} from '../controllers/shipment.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllShipments);
router.get('/:id', getShipmentById);
router.post('/', createShipment);
router.delete('/:id', deleteShipment);

export default router;
