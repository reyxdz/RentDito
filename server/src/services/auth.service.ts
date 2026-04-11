import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { hash, compare } from '../utils/password';
import { signAccess, signRefresh, verifyToken } from '../utils/jwt';
import transporter from '../config/mailer';

// ─── Helpers ────────────────────────────────────────────────

/** Strip sensitive fields and return a plain user object */
const sanitizeUser = (user: IUser) => {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.refreshToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

/** Generate an access + refresh token pair and persist the refresh token */
const generateTokenPair = async (user: IUser) => {
  const accessToken = signAccess(user._id.toString(), user.role);
  const refreshToken = signRefresh(user._id.toString());

  // Persist hashed refresh token on the user document
  user.refreshToken = refreshToken;
  await user.save();

  return { accessToken, refreshToken };
};

// ─── Public Service Methods ─────────────────────────────────

/**
 * Register a new user (role always defaults to 'user').
 * Returns sanitized user + token pair.
 */
export const register = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const passwordHash = await hash(data.password);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone,
    passwordHash,
    role: 'user',
  });

  const tokens = await generateTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

/**
 * Authenticate with email + password.
 * Returns sanitized user + token pair.
 */
export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshToken');
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (user.status === 'suspended') {
    throw Object.assign(new Error('Account is suspended. Contact support.'), { statusCode: 403 });
  }

  const isMatch = await compare(password, user.passwordHash);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const tokens = await generateTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

/**
 * Rotate refresh token.
 * Validates the incoming refresh token, issues a new pair, and invalidates the old one.
 */
export const refreshToken = async (incomingRefreshToken: string) => {
  const secret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
  let decoded: any;
  try {
    decoded = verifyToken(incomingRefreshToken, secret);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== incomingRefreshToken) {
    // Possible token reuse attack — clear all refresh tokens
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    throw Object.assign(new Error('Invalid refresh token – possible reuse detected'), { statusCode: 401 });
  }

  const tokens = await generateTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

/**
 * Forgot password – generate a reset token and email it.
 */
export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) {
    // Don't reveal whether the email exists
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@rentdito.com',
      to: user.email,
      subject: 'RentDito – Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      `,
    });
  } catch (err) {
    // Rollback token on mail failure
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    throw Object.assign(new Error('Failed to send reset email. Try again later.'), { statusCode: 500 });
  }
};

/**
 * Reset password using the token from the email link.
 */
export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires +refreshToken');

  if (!user) {
    throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
  }

  user.passwordHash = await hash(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshToken = undefined; // Invalidate existing sessions
  await user.save();
};

/**
 * Logout – clear the stored refresh token.
 */
export const logout = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { refreshToken: undefined });
};
