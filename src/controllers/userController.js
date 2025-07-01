import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

// Updated sync function (now mainly for fallback)
export const syncUser = async (req, res) => {
  console.log("🔵 syncUser endpoint hit (fallback)");
  
  const userId = req.auth?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: Clerk session missing' });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("👤 User not found, creating via fallback sync...");
      
      const clerkUser = await clerkClient.users.getUser(userId);
      
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0].emailAddress,
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        },
      });
      
      return res.status(201).json({ message: 'User synced via fallback', user });
    }

    res.status(200).json({ message: 'User already exists', user });
  } catch (err) {
    console.error("💥 Error in syncUser:", err);
    res.status(500).json({ message: 'Failed to sync user', error: err.message });
  }
};

// New function to get current user
export const getUser = async (req, res) => {
  console.log("👤 getUser endpoint hit");
  
  const userId = req.auth?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};
