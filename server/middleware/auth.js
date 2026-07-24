const { supabase } = require('../config/supabase');
const { verifyToken } = require('../services/jwt');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const userId = payload.sub;
  if (!userId) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ message: 'Profile not found' });
  }

  req.user = { id: profile.id, email: profile.email };
  req.profile = profile;
  next();
}

/** Optional auth — sets req.profile when a valid token is present. */
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    if (!payload?.sub) return next();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle();
    if (profile) {
      req.user = { id: profile.id, email: profile.email };
      req.profile = profile;
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

function requireVerified(req, res, next) {
  if (!req.profile?.verified_at) {
    return res.status(403).json({
      message: 'Discord verification required before creating or joining events',
      code: 'DISCORD_REQUIRED',
    });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile || !roles.includes(req.profile.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.profile || req.profile.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireVerified,
  requireRole,
  requireAdmin,
};
