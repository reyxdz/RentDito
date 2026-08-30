import crypto from 'crypto';
import prisma from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';
import { serializeProfile } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import transporter from '../config/mailer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/** Drop duplicate property ids -- `staff_property_assignments` has a
 * compound primary key (`staffId`, `propertyId`), so unlike the old Mongo
 * array (which tolerated repeated ids with no consequence), a `createMany`
 * with a duplicate would throw a spurious unique-constraint error. The old
 * array had no real "ordering" or "multiplicity" semantics clients depended
 * on (it was always consumed as a set via `.some()`/`.includes()` -- see
 * every other service's `assignedPropertyIds` usage), so de-duplicating
 * here is a safe, deliberate adaptation to the relational shape.
 */
const dedupeIds = (ids: string[]): string[] => Array.from(new Set(ids));

/**
 * Flat array of a staff member's assigned property ids (NOT populated) --
 * the direct replacement for reading `User.assignedPropertyIds` off the
 * Mongo document. Used by every write path (`inviteStaff`,
 * `updatePermissions`, `updateAssignedProperties`), none of which ever
 * called `.populate()` on assignedPropertyIds in the original Mongoose
 * code -- only `getStaff` did.
 */
const getAssignedPropertyIds = async (staffId: string): Promise<string[]> => {
  const rows = await prisma.staffPropertyAssignment.findMany({
    where: { staffId },
    select: { propertyId: true },
  });
  return rows.map((r) => r.propertyId);
};

/**
 * Get all staff belonging to a landlord.
 *
 * `.populate('assignedPropertyIds', 'name')` used to replace the scalar
 * array with an array of `{ _id, name }` property objects. The join table
 * has no such embedding, so this batches one `staff_property_assignments`
 * query (with `property` included, selecting only `id`/`name` to mirror the
 * populate's field selection) across every staff row in a single round
 * trip, then groups the results back onto each staff member's
 * `assignedPropertyIds` key -- preserving the exact populated shape
 * byte-for-byte, including `_id` (never `id`, matching how Mongoose's
 * default `toJSON()` never emits an `id` virtual -- confirmed against the
 * captured golden fixtures, none of which carry an `id` key anywhere).
 */
export const getStaff = async (landlordId: string) => {
  const staffRows = await prisma.profile.findMany({
    where: { landlordId, role: 'staff' },
    orderBy: { createdAt: 'desc' },
  });

  if (staffRows.length === 0) return [];

  const assignments = await prisma.staffPropertyAssignment.findMany({
    where: { staffId: { in: staffRows.map((s) => s.id) } },
    include: { property: { select: { id: true, name: true } } },
  });

  const assignedByStaff = new Map<string, { _id: string; name: string }[]>();
  for (const a of assignments) {
    const list = assignedByStaff.get(a.staffId) ?? [];
    list.push({ _id: a.property.id, name: a.property.name });
    assignedByStaff.set(a.staffId, list);
  }

  return staffRows.map((row) => {
    const shaped = serializeProfile(row)!;
    shaped.assignedPropertyIds = assignedByStaff.get(row.id) ?? [];
    return shaped;
  });
};

/**
 * Invite a new staff member.
 *
 * `profiles.id` has a real FK to `auth.users(id)` (ON DELETE CASCADE), so
 * the Supabase auth user must be created FIRST, exactly like
 * `auth.service.ts`'s `register()`. `email_confirm: true` so Supabase never
 * blocks sign-in on its own -- the app's `verificationStatus` (set to
 * 'verified' below, matching the pre-migration "staff are pre-verified by
 * landlord" behavior) is the real login gate.
 *
 * The `profiles` insert and the (optional) initial
 * `staff_property_assignments` rows are wrapped in one
 * `prisma.$transaction` so they succeed or fail together. If that
 * transaction fails for ANY reason (duplicate email racing past the
 * pre-check, a bogus `assignedPropertyIds` entry, ...), the just-created
 * Supabase auth user is rolled back (deleted) so a retry with the same
 * email works, instead of leaving an orphaned auth user with no profile.
 */
export const inviteStaff = async (
  landlordId: string,
  data: {
    name: string;
    email: string;
    positionName?: string;
    permissions?: string[];
    assignedPropertyIds?: string[];
  }
) => {
  const email = data.email.toLowerCase();

  // Check for existing email (preserves the pre-migration message/status).
  const existingProfile = await prisma.profile.findUnique({ where: { email } });
  if (existingProfile) {
    throw Object.assign(new Error('A user with this email already exists.'), { statusCode: 409 });
  }

  // Generate temp password (kept from the original: a 12-char random hex
  // string), used as the Supabase auth password and emailed to the invitee.
  const tempPassword = crypto.randomBytes(6).toString('hex');

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (error) {
    const status = error.status === 422 ? 409 : 400;
    throw Object.assign(
      new Error(status === 409 ? 'A user with this email already exists.' : error.message),
      { statusCode: status }
    );
  }

  const propertyIds = dedupeIds(data.assignedPropertyIds || []);

  let staff;
  try {
    staff = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({
        data: {
          id: created.user.id,
          name: data.name,
          email,
          role: 'staff',
          landlordId,
          positionName: data.positionName || 'Staff',
          permissions: data.permissions || ['dashboard'],
          verificationStatus: 'verified', // Staff are pre-verified by landlord
        },
      });

      if (propertyIds.length > 0) {
        await tx.staffPropertyAssignment.createMany({
          data: propertyIds.map((propertyId) => ({ staffId: profile.id, propertyId })),
        });
      }

      return profile;
    });
  } catch (err) {
    // Roll back the orphaned Supabase auth user so a retry with the same
    // email works -- consistent with auth.service.ts's register().
    await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {
      /* best-effort cleanup -- surface the original error either way */
    });
    throw toHttpError(err);
  }

  // Send invitation email with temp password. Failure here must not fail
  // the invite -- the staff account already exists (matches pre-migration
  // behavior exactly: original code only logged this failure).
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@rentdito.com',
      to: data.email,
      subject: 'RentDito - You have been invited as staff',
      html: `
        <h2>Welcome to RentDito!</h2>
        <p>You have been invited as a <strong>${data.positionName || 'Staff'}</strong> member.</p>
        <p>Here are your temporary login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login">Log in to RentDito</a>
      `,
    });
  } catch (err) {
    console.error('Failed to send staff invitation email:', err);
  }

  // No sensitive fields to strip (Supabase owns credentials now); matches
  // the original, which never returned the temp password in the response
  // body either -- only the email carried it.
  return serializeProfile(staff, { assignedPropertyIds: propertyIds });
};

/**
 * Update a staff member's permissions.
 */
export const updatePermissions = async (
  staffId: string,
  landlordId: string,
  permissions: string[]
) => {
  if (!isValidId(staffId)) {
    throw Object.assign(new Error('Invalid staff ID'), { statusCode: 400 });
  }

  const existing = await prisma.profile.findFirst({ where: { id: staffId, landlordId, role: 'staff' } });
  if (!existing) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  const updated = await prisma.profile.update({
    where: { id: existing.id },
    data: { permissions },
  });

  const assignedPropertyIds = await getAssignedPropertyIds(updated.id);
  return serializeProfile(updated, { assignedPropertyIds });
};

/**
 * Update a staff member's assigned properties.
 *
 * `assignedPropertyIds` is no longer a scalar array column on the staff
 * row -- it's the `staff_property_assignments` join table. Mongoose's
 * "overwrite the whole array" semantics become a delete-then-insert of the
 * join rows, wrapped in one `prisma.$transaction` so a partial write (all
 * old rows gone, only some new ones inserted) is never observable. A
 * trailing no-op `profile.update({ data: {} })` inside the same
 * transaction bumps `updatedAt` -- the original `staff.save()` touched the
 * whole document (including `updatedAt`) even though only the array
 * changed, and that column now lives outside the rows being
 * deleted/inserted.
 */
export const updateAssignedProperties = async (
  staffId: string,
  landlordId: string,
  propertyIds: string[]
) => {
  if (!isValidId(staffId)) {
    throw Object.assign(new Error('Invalid staff ID'), { statusCode: 400 });
  }

  const existing = await prisma.profile.findFirst({ where: { id: staffId, landlordId, role: 'staff' } });
  if (!existing) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  const dedupedIds = dedupeIds(propertyIds);

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.staffPropertyAssignment.deleteMany({ where: { staffId: existing.id } });
      if (dedupedIds.length > 0) {
        await tx.staffPropertyAssignment.createMany({
          data: dedupedIds.map((propertyId) => ({ staffId: existing.id, propertyId })),
        });
      }
      return tx.profile.update({ where: { id: existing.id }, data: {} });
    });
  } catch (err) {
    throw toHttpError(err);
  }

  return serializeProfile(updated, { assignedPropertyIds: dedupedIds });
};

/**
 * Remove a staff member (delete their account).
 *
 * `profiles.id -> auth.users(id)` is `ON DELETE CASCADE`, so deleting the
 * Supabase auth user is the single source of truth for the whole removal:
 * Postgres cascades that delete down into `profiles` itself in the same
 * database transaction GoTrue runs internally. Several OTHER tables
 * reference `profiles` with `onDelete: Restrict` (contracts, payments,
 * rental applications, tickets [reporter], inventory records, transfer
 * requests, documents, incident reports, audit logs, ...) specifically so
 * a staff member with historical activity can't silently vanish out from
 * under records that still need to point at *someone*. If any such record
 * exists, the cascaded `profiles` delete violates one of those Restrict
 * constraints, Postgres rolls the whole delete back, and Supabase's
 * `deleteUser` surfaces it as an error -- caught below and translated into
 * a clear 409 instead of leaking a raw "foreign key constraint" message.
 * Nothing is removed in that case: the staff member, their auth account,
 * and every related record are left exactly as they were, and the caller
 * must reassign/resolve those records before removal can succeed.
 */
export const removeStaff = async (staffId: string, landlordId: string) => {
  if (!isValidId(staffId)) {
    throw Object.assign(new Error('Invalid staff ID'), { statusCode: 400 });
  }

  const existing = await prisma.profile.findFirst({ where: { id: staffId, landlordId, role: 'staff' } });
  if (!existing) {
    throw Object.assign(new Error('Staff member not found.'), { statusCode: 404 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(existing.id);
  if (error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/foreign key|constraint|violat/i.test(message)) {
      throw Object.assign(
        new Error(
          'Cannot remove this staff member: they have related records (e.g. assigned tickets, contracts, or recorded payments) that must be reassigned or resolved first.'
        ),
        { statusCode: 409 }
      );
    }
    throw Object.assign(new Error(message || 'Failed to remove staff member.'), { statusCode: 400 });
  }
};
