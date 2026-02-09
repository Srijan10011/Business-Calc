import express from 'express';
import { getPendingRequests, approveRequest, rejectRequest, checkUserStatus } from '../controllers/requestController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getPendingRequests);
router.post('/:request_id/approve', authMiddleware, approveRequest);
router.post('/:request_id/reject', authMiddleware, rejectRequest);
router.get('/status', authMiddleware, checkUserStatus);

export default router;
