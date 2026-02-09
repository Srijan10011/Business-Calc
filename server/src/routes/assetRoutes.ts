import express from 'express';
import { createAsset, getAssets } from '../controllers/assetController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loadPermissions, requirePermission } from '../middleware/permissionMiddleware';

const router = express.Router();

router.get('/', authMiddleware, loadPermissions, requirePermission('assets.view'), getAssets);
router.post('/', authMiddleware, loadPermissions, requirePermission('assets.create'), createAsset);

export default router;
