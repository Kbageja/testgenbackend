import express from 'express';
import { createTest, evaluateTestAttempt, getAttemptedTestsByCreator, getPublicTests, getResultById, getTestById, getTestsByCreator, getUserTestStats } from '../controllers/createTest.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/create', requireAuth, createTest);
router.post('/evaluate', requireAuth, evaluateTestAttempt);
router.get('/getTests',requireAuth,getTestById)

router.get('/getResult',requireAuth,getResultById);
router.get('/getTests/:id', requireAuth, getTestById);
router.get('/getMyTest/:id', requireAuth, getTestsByCreator);
router.get('/getAttempted/:id', requireAuth, getAttemptedTestsByCreator);
router.get('/getStats',requireAuth,getUserTestStats);
export default router;
