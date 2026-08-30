import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';
import { serializeDoc } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Sign in against Supabase and remap snake_case tokens to the frozen
 * camelCase contract (`accessToken` / `refreshToken`).
 */
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
};

// ─── Public Service Methods ─────────────────────────────────

/**
 * Register a new user (role always defaults to 'user').
 * Returns dual-id user + camelCase token pair.
 *
 * `profiles.id` has a real FK to `auth.users(id)` (ON DELETE CASCADE), so the
 * Supabase auth user MUST be created first. If the profile insert then fails
 * (e.g. a race on the citext-unique email), the auth user is deleted so a
 * retry with the same email is possible instead of leaving an orphan.
 */
export const register = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const email = data.email.toLowerCase();

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
  });
  if (error) {
    const status = error.status === 422 ? 409 : 400;
    throw Object.assign(
      new Error(status === 409 ? 'Email already registered' : error.message),
      { statusCode: status }
    );
  }

  try {
    const profile = await prisma.profile.create({
      data: {
        id: created.user.id,
        name: data.name,
        email,
        phone: data.phone,
        role: 'user',
      },
    });

    const session = await signIn(email, data.password);
    return { user: serializeDoc(profile), ...session };
  } catch (err) {
    // Roll back the orphaned auth user so a retry with the same email works.
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {
      /* best-effort cleanup — surface the original error either way */
    });
    throw toHttpError(err);
  }
};

/**
 * Authenticate with email + password.
 * Preserves the pre-Supabase business gates exactly as before: suspended
 * accounts and unverified emails are rejected with the same messages and
 * status codes ahead of the credential check, since golden fixtures and the
 * client UI depend on these exact strings.
 */
export const login = async (email: string, password: string) => {
  const normalized = email.toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { email: normalized } });
  if (!profile) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }
  if (profile.status === 'suspended') {
    throw Object.assign(new Error('Account is suspended. Contact support.'), { statusCode: 403 });
  }
  if (profile.verificationStatus !== 'verified') {
    throw Object.assign(new Error('Please verify your email address to continue.'), { statusCode: 403 });
  }

  const session = await signIn(normalized, password);
  return { user: serializeDoc(profile), ...session };
};

/**
 * Rotate refresh token via Supabase.
 */
export const refreshToken = async (incomingRefreshToken: string) => {
  const { data, error } = await supabaseAdmin.auth.refreshSession({
    refresh_token: incomingRefreshToken,
  });
  if (error || !data.session || !data.user) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  return {
    user: profile ? serializeDoc(profile) : undefined,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
};

/**
 * Forgot password – Supabase sends the mail; never reveal whether the
 * address exists.
 */
export const forgotPassword = async (email: string) => {
  await supabaseAdmin.auth.resetPasswordForEmail(email.toLowerCase(), {
    redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password`,
  });
};

/**
 * Reset password using the recovery token from the email link.
 */
export const resetPassword = async (token: string, newPassword: string) => {
  const { data, error } = await supabaseAdmin.auth.verifyOtp({
    token_hash: token,
    type: 'recovery',
  });
  if (error || !data.user) {
    throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    password: newPassword,
  });
  if (updateError) {
    throw Object.assign(new Error('Failed to reset password'), { statusCode: 400 });
  }
};

/**
 * Logout – revoke the user's Supabase sessions.
 */
export const logout = async (userId: string) => {
  await supabaseAdmin.auth.admin.signOut(userId);
};
