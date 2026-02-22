import express from 'express';
import { createAsset, getAssets } from '../controllers/assetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';
import { loadUserBusiness } from '../middleware/loadUserBusiness';

const router = express.Router();

router.get('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('assets.view'), getAssets);
router.post('/', authMiddleware, loadUserBusiness, loadPermissions, requirePermission('assets.create'), createAsset);

export default router;
