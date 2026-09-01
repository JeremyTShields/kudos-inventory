import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAllWorkStations,
  getWorkStationById,
  createWorkStation,
  updateWorkStation,
  deleteWorkStation
} from '../controllers/workStation.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getAllWorkStations);
router.get('/:id', getWorkStationById);
router.post('/', createWorkStation);
router.put('/:id', updateWorkStation);
router.delete('/:id', deleteWorkStation);

export default router;
