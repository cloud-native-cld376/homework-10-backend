export function attachSessionUser(req, res, next) {
  if (req.session?.userId) {
    res.locals.currentUser = {
      id: req.session.userId,
      email: req.session.userEmail,
    };
  } else {
    res.locals.currentUser = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.redirect('/login');
  }
  next();
}

export function redirectIfAuthed(req, res, next) {
  if (req.session?.userId) {
    return res.redirect('/');
  }
  next();
}
