import express from 'express';
import { createTest, evaluateTestAttempt, getAttemptedTestsByCreator, getPublicTests, getResultById, getTestById, getTestsByCreator } from '../controllers/createTest.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

router.post('/create', requireAuth, createTest);
router.post('/evaluate', requireAuth, evaluateTestAttempt);
router.get('/getTests',requireAuth,getTestById)

router.get('/getResult',requireAuth,getResultById);
router.get('/getMyTest',requireAuth,getTestsByCreator);
router.get('/getPublicTests',requireAuth,getPublicTests);
router.get('/getAttempted',requireAuth,getAttemptedTestsByCreator);
export default router;
