import express from 'express';
import { createAsset, getAssets } from '../controllers/assetController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getAssets);
router.post('/', authMiddleware, createAsset);

export default router;
