import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // ✅ Import CORS
import { PrismaClient } from '@prisma/client';
import clerkMiddleware from './middleware/clerkAuth.js';
import testRoutes from './routes/testRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ✅ Enable CORS with specific origin (frontend URL)
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true, // allow cookies and auth headers
  })
);

app.use(express.json());
app.use(clerkMiddleware);
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
});
