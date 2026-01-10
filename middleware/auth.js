// middleware/auth.js

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized: Please log in.' });
  }
  res.redirect('/login.html');
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized: Please log in.' });
    }
    const userRole = req.session.user.role;
    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
    }
  };
};

module.exports = { isAuthenticated, checkRole };