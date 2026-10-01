const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Your admin session has expired' });
  }
}

module.exports = { requireAdmin };
