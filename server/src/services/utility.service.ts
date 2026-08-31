import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeList } from '../utils/serialize';
import { createUtilityBill } from './billing.service';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies anywhere in
// this file. `getAvailableUnits` is the only function embedding a real
// Prisma row (a flat `Unit` select with no relation `include` at all --
// the original never populated `propertyId` here either, matching
// `.select('_id unitIdentifier propertyId').lean()`'s scalar-only shape).
// Every other export builds a plain JS aggregation object from scratch; the
// one relation this file DOES read (`Bill.unit` in `getHighestUsage`) is a
// narrow two-field select with no full-property/profile embed to shape.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

/**
 * Whether `staffId` is assigned to `propertyId` -- direct replacement for
 * Mongoose's `user.assignedPropertyIds?.some(...)`, which lived directly on
 * the User document; in Postgres it's the `staff_property_assignments` join
 * table (same pattern every other ported service's own scoped-access check
 * already uses).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * INVALID-ID HANDLING (task-14 pattern, copied verbatim): a client-supplied
 * `propertyId` shaped like a Mongo ObjectId (or anything else that isn't a
 * syntactically valid Postgres UUID) would raise Prisma's `P2023` if handed
 * straight to `findUnique` -- unmapped by `toHttpError`, falling through to a
 * 500 instead of this function's own pre-existing 404. No fixture exercises
 * `submitMeterReadings` (the only caller of this helper) either way; added
 * pre-emptively, at zero risk, for consistency with every other id-taking
 * helper across this migration.
 */
const verifyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throwWithStatus('User not found', 404);

  if (!isValidId(propertyId)) throwWithStatus('Property not found', 404);
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throwWithStatus('Property not found', 404);

  const isLandlord = property!.landlordId === userId;
  const isStaff = user!.role === 'staff' && (await isStaffAssignedToProperty(userId, propertyId));
  const isAdmin = user!.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throwWithStatus('Access denied', 403);
  }
};

/**
 * Property ids this user is permitted to see utility data for. Direct port
 * of the original's role branching; the only structural change is the
 * staff branch, which now reads the `staff_property_assignments` join table
 * instead of a `User.assignedPropertyIds[]` array field that no longer
 * exists on `Profile`.
 */
const resolveManagedPropertyIds = async (userId: string): Promise<string[]> => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throwWithStatus('User not found', 404);

  if (user!.role === 'super_admin') {
    const props = await prisma.property.findMany({ select: { id: true } });
    return props.map((p) => p.id);
  }

  if (user!.role === 'landlord') {
    const props = await prisma.property.findMany({ where: { landlordId: userId }, select: { id: true } });
    return props.map((p) => p.id);
  }

  if (user!.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    return assignments.map((a) => a.propertyId);
  }

  return throwWithStatus('Access denied', 403);
};

// ─────────────────────────────────────────────────────────────
//  submitMeterReadings
// ─────────────────────────────────────────────────────────────

export const submitMeterReadings = async (userId: string, data: {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  allocationMode?: 'full' | 'per_head';
  utilityBreakdown: {
    electricity?: { previousReading: number; currentReading: number; rate: number };
    water?: { previousReading: number; currentReading: number; rate: number };
    internet?: { amount: number };
    others?: { description?: string; amount: number };
  };
  notes?: string;
}) => {
  if (!isValidId(data.tenancyId)) throwWithStatus('Tenancy not found', 404);
  const tenancy = await prisma.tenancy.findUnique({ where: { id: data.tenancyId } });
  if (!tenancy) throwWithStatus('Tenancy not found', 404);

  await verifyManagementAccess(userId, tenancy!.propertyId);

  // billing.service.ts's own `createUtilityBill` (ported, Task 22) re-derives
  // the tenancy and re-runs an equivalent management-access check itself
  // (`loadTenancyForBillCreate` + its own `verifyManagementAccess`, same
  // 'Tenancy not found'/404, 'User not found'/404, 'Property not found'/404,
  // 'Access denied'/403 messages) -- delegating here is not a behavior
  // change, just one extra round trip's worth of redundant checking
  // preserved from the original, which called `createUtilityBill` the same
  // way after doing its own pre-check.
  return createUtilityBill(userId, data);
};

// ─────────────────────────────────────────────────────────────
//  getConsumption -- JS-side grouping over `Bill.utilityBreakdown` jsonb,
//  read (never SQL-side aggregated), per the brief's explicit instruction
//  to keep this shape identical to the original.
// ─────────────────────────────────────────────────────────────

interface UtilityBreakdownJSON {
  electricity?: { consumption?: number; amount?: number };
  water?: { consumption?: number; amount?: number };
  internet?: { amount?: number };
  others?: { amount?: number };
}

export const getConsumption = async (
  userId: string,
  params: { propertyId?: string; year?: number; months?: number } = {}
) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const months = params.months || 6;
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);

  const where: Prisma.BillWhereInput = {
    propertyId: { in: propertyIds },
    createdAt: { gte: start, lte: end },
    type: { in: ['utility', 'combined'] },
  };
  if (params.propertyId) where.propertyId = params.propertyId;
  if (params.year) {
    where.billingPeriodStart = {
      gte: new Date(params.year, 0, 1),
      lte: new Date(params.year, 11, 31),
    };
  }

  const bills = await prisma.bill.findMany({ where });
  const grouped = new Map<string, { electricity: number; water: number; utilityAmount: number }>();

  for (const bill of bills) {
    const d = bill.billingPeriodStart;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped.has(key)) grouped.set(key, { electricity: 0, water: 0, utilityAmount: 0 });

    const breakdown = bill.utilityBreakdown as UtilityBreakdownJSON | null;
    const row = grouped.get(key)!;
    row.electricity += breakdown?.electricity?.consumption || 0;
    row.water += breakdown?.water?.consumption || 0;
    // `utilityAmount` is a Prisma.Decimal column (unlike the jsonb-nested
    // consumption/amount numbers above, which were already written as plain
    // numbers by billing.service.ts and read back that way) -- `.toNumber()`
    // BEFORE the `+=` is required, not optional: a raw Decimal instance is
    // always truthy and `number += DecimalInstance` triggers JS's default
    // string-coercion path (`Decimal.prototype.toString()`), silently
    // turning the accumulation into string concatenation instead of
    // arithmetic.
    row.utilityAmount += bill.utilityAmount.toNumber();
  }

  return [...grouped.entries()]
    .map(([period, values]) => ({ period, ...values }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

// ─────────────────────────────────────────────────────────────
//  getHighestUsage -- the one populate (`.populate('unitId', 'unitIdentifier')`)
// ─────────────────────────────────────────────────────────────

export const getHighestUsage = async (userId: string, params: { propertyId?: string; limit?: number } = {}) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const where: Prisma.BillWhereInput = {
    propertyId: { in: propertyIds },
    type: { in: ['utility', 'combined'] },
  };
  if (params.propertyId) where.propertyId = params.propertyId;

  const bills = await prisma.bill.findMany({
    where,
    include: { unit: { select: { id: true, unitIdentifier: true } } },
  });
  const usageMap = new Map<string, { unitId: string; unitIdentifier: string; total: number }>();

  for (const bill of bills) {
    const unitId = bill.unit?.id;
    if (!unitId) continue;
    const unitIdentifier = bill.unit?.unitIdentifier || 'Unknown Unit';
    const breakdown = bill.utilityBreakdown as UtilityBreakdownJSON | null;
    const usage = (breakdown?.electricity?.consumption || 0) + (breakdown?.water?.consumption || 0);
    if (!usageMap.has(unitId)) usageMap.set(unitId, { unitId, unitIdentifier, total: 0 });
    usageMap.get(unitId)!.total += usage;
  }

  return [...usageMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, params.limit || 10);
};

// ─────────────────────────────────────────────────────────────
//  getOverconsumption
// ─────────────────────────────────────────────────────────────

export const getOverconsumption = async (userId: string, params: { propertyId?: string; multiplier?: number } = {}) => {
  const ranked = await getHighestUsage(userId, { propertyId: params.propertyId, limit: 1000 });
  if (!ranked.length) return [];
  const total = ranked.reduce((sum, row) => sum + row.total, 0);
  const avg = total / ranked.length;
  const threshold = avg * (params.multiplier || 1.5);

  return ranked
    .filter((row) => row.total > threshold)
    .map((row) => ({
      ...row,
      average: Number(avg.toFixed(2)),
      threshold: Number(threshold.toFixed(2)),
    }));
};

// ─────────────────────────────────────────────────────────────
//  getExpenseSummary -- pure jsonb reads, no Decimal columns touched at all.
// ─────────────────────────────────────────────────────────────

export const getExpenseSummary = async (userId: string, params: { propertyId?: string } = {}) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const where: Prisma.BillWhereInput = {
    propertyId: { in: propertyIds },
    type: { in: ['utility', 'combined'] },
  };
  if (params.propertyId) where.propertyId = params.propertyId;

  const bills = await prisma.bill.findMany({ where });
  let electricity = 0;
  let water = 0;
  let internet = 0;
  let others = 0;

  for (const bill of bills) {
    // jsonb numbers deserialize as plain JS numbers (never Prisma.Decimal),
    // matching the original's direct `|| 0` reads exactly -- this function
    // never touches a Decimal-typed column.
    const breakdown = bill.utilityBreakdown as UtilityBreakdownJSON | null;
    electricity += breakdown?.electricity?.amount || 0;
    water += breakdown?.water?.amount || 0;
    internet += breakdown?.internet?.amount || 0;
    others += breakdown?.others?.amount || 0;
  }

  return {
    electricity: Number(electricity.toFixed(2)),
    water: Number(water.toFixed(2)),
    internet: Number(internet.toFixed(2)),
    others: Number(others.toFixed(2)),
    total: Number((electricity + water + internet + others).toFixed(2)),
  };
};

// ─────────────────────────────────────────────────────────────
//  getAvailableUnits -- the one real DB-row embed in this file.
// ─────────────────────────────────────────────────────────────

export const getAvailableUnits = async (userId: string, propertyId?: string) => {
  const propertyIds = await resolveManagedPropertyIds(userId);
  const where: Prisma.UnitWhereInput = { propertyId: { in: propertyIds } };
  if (propertyId) where.propertyId = propertyId;

  // The original had no `.sort()` at all (Mongo natural/insertion order).
  // `unit.service.ts`'s own `getUnitsByProperty` (Task 13) already hit this
  // exact ambiguity for the same 3 seeded units under the same
  // unsorted-in-Mongo original query, and established `unitIdentifier: asc`
  // as the reproducing order (confirmed against `unit.json`'s
  // `units-by-property-landlord1`: Room 2, Room 3, Room 4). Reused here for
  // the identical entity set rather than re-deriving a new tie-break.
  const units = await prisma.unit.findMany({
    where,
    select: { id: true, unitIdentifier: true, propertyId: true },
    orderBy: { unitIdentifier: 'asc' },
  });

  return serializeList(units);
};
