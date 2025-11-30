import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} from '../controllers/location.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllLocations);
router.get('/:id', getLocationById);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
