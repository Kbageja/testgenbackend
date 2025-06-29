// src/controllers/UserController.js
import { PrismaClient } from '@prisma/client';

import { clerkClient } from '@clerk/clerk-sdk-node';
const prisma = new PrismaClient();



export const syncUser = async (req, res) => {
  const userId = req.auth?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: Clerk session missing' });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      const clerkUser = await clerkClient.users.getUser(userId);

      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        },
      });

      return res.status(201).json({ message: 'User synced', user });
    }

    res.status(200).json({ message: 'User already exists', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to sync user', error: err.message });
  }
};
