import jwt from 'jsonwebtoken';

<<<<<<< HEAD
const accessSecret = process.env.JWT_ACCESS_SECRET || 'secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const accessExpiry = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;
const refreshExpiry = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any;

export interface JwtPayload {
  userId: string;
  role: string;
}

export const signAccessToken = (userId: string | mongoose.Types.ObjectId, role: string): string => {
  return jwt.sign({ userId: userId.toString(), role }, accessSecret, {
    expiresIn: accessExpiry,
  });
=======
export const signAccess = (userId: string, role: string) => {
    return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret', {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
    });
>>>>>>> 547a2946d22336af782ea5915525b71055b6e625
};

export const signRefresh = (userId: string) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    });
};

export const verifyToken = (token: string, secret: string) => {
    return jwt.verify(token, secret);
};
