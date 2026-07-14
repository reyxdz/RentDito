import jwt from 'jsonwebtoken';

/**
 * Sign a short-lived access token (default 15m).
 * Throws at startup if JWT_ACCESS_SECRET is not configured.
 */
export const signAccess = (userId: string, role: string) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('FATAL: JWT_ACCESS_SECRET environment variable is not set');
  return jwt.sign({ id: userId, role }, secret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Sign a long-lived refresh token (default 7d).
 * Throws at startup if JWT_REFRESH_SECRET is not configured.
 */
export const signRefresh = (userId: string) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set');
  return jwt.sign({ id: userId }, secret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};
