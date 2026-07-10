import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

/**
 * Extend Express Request to carry the authenticated user payload.
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Middleware that verifies the JWT access token from the Authorization header.
 * Attaches decoded user payload to req.user.
 * Returns 401 on missing, invalid, or expired tokens.
 */
const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      res.status(500).json({ status: 'error', message: 'Server misconfiguration: JWT secret not set' });
      return;
    }
    const decoded = verifyToken(token, secret) as { id: string; role: string };
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        status: 'error',
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Invalid token.',
    });
  }
};

export default auth;
