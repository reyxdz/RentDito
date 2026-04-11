import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';
const accessExpiry = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  role: string;
}

export const signAccessToken = (userId: string | mongoose.Types.ObjectId, role: string): string => {
  return jwt.sign({ userId: userId.toString(), role }, accessSecret, {
    expiresIn: accessExpiry,
  });
};

export const signRefreshToken = (userId: string | mongoose.Types.ObjectId, role: string): string => {
  return jwt.sign({ userId: userId.toString(), role }, refreshSecret, {
    expiresIn: refreshExpiry,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, accessSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, refreshSecret) as JwtPayload;
};
