import express from 'express';
import { getPendingRequests, approveRequest, rejectRequest, checkUserStatus } from '../controllers/requestController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/', authMiddleware, loadUserBusiness, getPendingRequests);
router.post('/:request_id/approve', authMiddleware, loadUserBusiness, approveRequest);
router.post('/:request_id/reject', authMiddleware, loadUserBusiness, rejectRequest);
router.get('/status', authMiddleware, checkUserStatus);

export default router;
