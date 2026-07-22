// JWT auth + role guard middleware.
// Assumes shared auth module signs tokens with { sub, role, name }.
const jwt = require('jsonwebtoken');

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next({ status: 401, code: 'NO_TOKEN', message: 'Missing bearer token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    next({ status: 401, code: 'BAD_TOKEN', message: 'Invalid token' });
  }
}

// Usage: requireRole('PMB_OFFICER') or requireRole('PMB_OFFICER','AUTHORIZED_PURCHASER')
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next({ status: 401, code: 'NO_AUTH', message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return next({ status: 403, code: 'FORBIDDEN', message: `Requires role: ${roles.join(', ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
