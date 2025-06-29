export const requireAuth = (req, res, next) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid Clerk session' });
  }

  next();
};
