const { supabase } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return res.status(401).json({ message: 'Profile not found' });
  }

  req.user = user;
  req.profile = profile;
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

function requireSuperadmin(req, res, next) {
  if (!req.profile || req.profile.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireSuperadmin };
