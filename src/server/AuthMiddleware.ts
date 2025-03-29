
export function requireAuth(req, res, next) {
  if (!req.session.user) {
   
    return res.redirect('/');
  }
  next();
}
export function attachUser(req, res, next) {
  if (req.session.user) {
    res.locals.user = req.session.user;
  }
  next();
}
