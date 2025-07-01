import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import clerkMiddleware from './middleware/clerkAuth.js';
import testRoutes from './routes/testRoutes.js';
import userRoutes from './routes/userRoutes.js';
import webhookRoutes from "./routes/webHookRoutes.js"

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ✅ Enable CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://testmaker-omega.vercel.app',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// 🚨 CRITICAL: Webhook routes MUST come BEFORE express.json() and clerkMiddleware
// Webhooks need raw body parsing, not JSON parsing
app.use('/api/webhooks', webhookRoutes);

// ✅ JSON parsing for non-webhook routes
app.use(express.json());

// ✅ Clerk middleware for protected routes (not webhooks)
app.use(clerkMiddleware);

// ✅ Protected routes
app.use('/api/tests', testRoutes);
app.use('/api/auth', userRoutes);

app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

// ✅ Sample protected route
app.get('/profile', async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found in DB' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/api/webhooks/clerk`);
});
