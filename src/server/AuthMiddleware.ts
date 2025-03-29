export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ 
      authenticated: false, 
      message: 'Authentication required' 
    });
  }
  next();
}
export function attachUser(req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
}
