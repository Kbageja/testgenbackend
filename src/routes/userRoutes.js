// src/routes/userRoutes.js
import express from 'express';
import { syncUser, getUser } from '../controllers/userController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// Keep sync endpoint as fallback (optional)
router.post('/sync', requireAuth, syncUser);

// Get current user endpoint
router.get('/me', requireAuth, getUser);

export default router;