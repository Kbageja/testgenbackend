// routes/webHookRoutes.js - Complete webhook implementation
import express from 'express';
import { Webhook } from 'svix';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify webhook signature
const verifyWebhook = (req, res, next) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const headers = req.headers;
  const payload = req.body;

  // Get the Svix headers
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing svix headers');
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;
  try {
    // Convert buffer to string for svix verification
    const payloadString = payload.toString();
    
    evt = wh.verify(payloadString, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  req.evt = evt;
  next();
};

// Raw body parser middleware for webhooks - MUST be first
const rawBodyParser = express.raw({ type: 'application/json' });

// Webhook handler
router.post('/clerk', rawBodyParser, verifyWebhook, async (req, res) => {
  const { type, data } = req.evt;
  
  console.log(`🔔 Webhook received: ${type}`);
  console.log('📄 Webhook data:', JSON.stringify(data, null, 2));

  try {
    switch (type) {
      case 'user.created':
        await handleUserCreated(data);
        break;
      case 'user.updated':
        await handleUserUpdated(data);
        break;
      case 'user.deleted':
        await handleUserDeleted(data);
        break;
      default:
        console.log(`🤷 Unhandled webhook type: ${type}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handler functions
async function handleUserCreated(data) {
  console.log('👤 Processing user.created webhook');
  
  const { id: clerkId, email_addresses, first_name, last_name } = data;
  
  if (!email_addresses || email_addresses.length === 0) {
    console.warn('⚠️ No email addresses found for user');
    return;
  }

  const primaryEmail = email_addresses.find(email => email.id === data.primary_email_address_id);
  const email = primaryEmail?.email_address || email_addresses[0]?.email_address;
  
  const name = `${first_name || ''} ${last_name || ''}`.trim();

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (existingUser) {
      console.log('👤 User already exists, skipping creation');
      return;
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name: name || email, // Fallback to email if no name
      },
    });

    console.log('✨ User created successfully via webhook:', user);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

async function handleUserUpdated(data) {
  console.log('🔄 Processing user.updated webhook');
  
  const { id: clerkId, email_addresses, first_name, last_name } = data;
  
  const primaryEmail = email_addresses?.find(email => email.id === data.primary_email_address_id);
  const email = primaryEmail?.email_address || email_addresses?.[0]?.email_address;
  
  const name = `${first_name || ''} ${last_name || ''}`.trim();

  try {
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: {
        email,
        name: name || email,
      },
    });

    console.log('✨ User updated successfully via webhook:', updatedUser);
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('👤 User not found for update, creating new user');
      await handleUserCreated(data);
    } else {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }
}

async function handleUserDeleted(data) {
  console.log('🗑️ Processing user.deleted webhook');
  
  const { id: clerkId } = data;

  try {
    await prisma.user.delete({
      where: { clerkId }
    });

    console.log('✨ User deleted successfully via webhook');
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('👤 User not found for deletion, already removed');
    } else {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
  }
}

export default router;