// src/routes/userRoutes.js
import express from 'express';
import { syncUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/sync', requireAuth, syncUser); // POST /api/auth/sync

export default router;
