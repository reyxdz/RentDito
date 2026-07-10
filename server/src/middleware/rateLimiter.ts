import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for login / register — 10 requests per 15 minutes per IP.
 * Protects against brute-force and credential-stuffing attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

/**
 * Stricter limiter for forgot-password — 3 requests per 15 minutes.
 * Prevents email-flooding abuse.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many password reset requests. Please try again later.',
  },
});

/**
 * General API limiter — 100 requests per minute per IP.
 * Prevents accidental or intentional request flooding.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
