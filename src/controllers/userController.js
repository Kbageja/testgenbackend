// src/controllers/UserController.js
import { PrismaClient } from '@prisma/client';

import { clerkClient } from '@clerk/clerk-sdk-node';
const prisma = new PrismaClient();



export const syncUser = async (req, res) => {
  console.log("🔵 syncUser endpoint hit");
  console.log("🔵 req.auth:", req.auth);
  
  const userId = req.auth?.userId;
  
  if (!userId) {
    console.log("❌ No userId found in req.auth");
    return res.status(401).json({ message: 'Unauthorized: Clerk session missing' });
  }
  
  console.log("✅ userId found:", userId);

  try {
    console.log("🔍 Checking if user exists in database...");
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log("👤 User not found, creating new user...");
      
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        console.log("📋 Clerk user data:", {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName
        });

        user = await prisma.user.create({
          data: {
            clerkId: userId,
            email: clerkUser.emailAddresses[0].emailAddress,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
          },
        });
        
        console.log("✨ User created successfully:", user);
        return res.status(201).json({ message: 'User synced', user });
      } catch (clerkError) {
        console.error("❌ Error fetching from Clerk:", clerkError);
        throw clerkError;
      }
    }

    console.log("👤 User already exists:", user);
    res.status(200).json({ message: 'User already exists', user });
  } catch (err) {
    console.error("💥 Error in syncUser:", err);
    console.error("💥 Error stack:", err.stack);
    res.status(500).json({ message: 'Failed to sync user', error: err.message });
  }
};
