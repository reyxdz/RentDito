import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';
import { serializeProfile } from '../utils/serialize';
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

/**
 * Serialize a `Profile` row for an auth response, resolving
 * `assignedPropertyIds` from the `staff_property_assignments` join table.
 * Only staff profiles can have assignments at all (see
 * schema.prisma/StaffPropertyAssignment), so the query is skipped entirely
 * for every other role -- landlords, admins, and tenants always get `[]`,
 * matching what Mongo's `User.assignedPropertyIds` returned for them too.
 */
const serializeAuthProfile = async (profile: { id: string; role: string } & Record<string, unknown>) => {
  const assignedPropertyIds =
    profile.role === 'staff'
      ? (
          await prisma.staffPropertyAssignment.findMany({
            where: { staffId: profile.id },
            select: { propertyId: true },
          })
        ).map((a) => a.propertyId)
      : [];

  return serializeProfile(profile, { assignedPropertyIds });
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
    return { user: await serializeAuthProfile(profile), ...session };
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
  return { user: await serializeAuthProfile(profile), ...session };
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
    user: profile ? await serializeAuthProfile(profile) : undefined,
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
 *
 * BUG FIXED HERE: this used to be `logout(userId: string)`, called as
 * `authService.logout(req.user.id)` (the legacy Mongo id, or the Postgres
 * UUID for a profile with none) and passed straight to
 * `supabaseAdmin.auth.admin.signOut(userId)`. That was wrong on TWO
 * independent levels:
 *
 *  1. Wrong id space (the class of bug this migration's `payment.controller`
 *     fix already found once): `req.user.id` is the legacy/strangler id, not
 *     `req.user.pgId` -- irrelevant here since the argument shouldn't be an
 *     id at all (see #2), but it was doubly wrong regardless.
 *  2. Wrong API contract entirely: GoTrue's admin `signOut(jwt, scope?)` --
 *     see `@supabase/auth-js`'s `GoTrueAdminApi.signOut` -- takes the
 *     caller's own SESSION JWT (the access token from the `Authorization`
 *     header), never a user id. There is no admin endpoint that revokes
 *     sessions BY USER ID; Supabase's admin API can only sign out a
 *     specific, already-known session token (default `scope: 'global'`
 *     revokes every refresh token tied to that session's user, i.e. "log
 *     out everywhere", not just the one session). Handing it a UUID/Mongo
 *     id made the call a no-op against a token GoTrue couldn't associate
 *     with any real session -- it fails silently (`signOut` catches
 *     `AuthError` and returns `{error}` rather than throwing), so nothing
 *     was ever actually revoked.
 *
 * Fixed by accepting the raw access token instead of any id, and passing
 * THAT to `signOut` -- the only shape the underlying API actually accepts.
 * `auth.controller.ts` now extracts it from the `Authorization` header the
 * same way `middleware/auth.ts` does, and no longer references
 * `req.user.id`/`req.user.pgId` for this route at all.
 */
export const logout = async (accessToken: string) => {
  await supabaseAdmin.auth.admin.signOut(accessToken);
};
