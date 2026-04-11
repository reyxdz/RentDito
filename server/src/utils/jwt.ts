import jwt from 'jsonwebtoken';

export const signAccess = (userId: string, role: string) => {
    return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET || 'fallback_access_secret', {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
    });
};

export const signRefresh = (userId: string) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret', {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    });
};

export const verifyToken = (token: string, secret: string) => {
    return jwt.verify(token, secret);
};
