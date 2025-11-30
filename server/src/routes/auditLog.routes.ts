import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats
} from '../controllers/auditLog.controller';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/logs', getAllAuditLogs);
router.get('/logs/:id', getAuditLogById);
router.get('/stats', getAuditStats);

export default router;