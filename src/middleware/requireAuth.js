export const requireAuth = (req, res, next) => {
  console.log("🔐 requireAuth middleware hit");
  console.log("🔐 req.auth:", req.auth);
  
  if (!req.auth || !req.auth.userId) {
    console.log("❌ Auth check failed");
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid Clerk session' });
  }

  console.log("✅ Auth check passed");
  next();
};
