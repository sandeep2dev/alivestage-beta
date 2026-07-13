const jwt = require('jsonwebtoken');

const TOKEN_TTL = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signToken(profile) {
  return jwt.sign(
    {
      sub: profile.id,
      email: profile.email,
      role: profile.role,
    },
    getSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
