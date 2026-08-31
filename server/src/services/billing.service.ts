import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';
import { PROPERTY_REF_SELECT, shapePropertyRef } from '../utils/propertyRef.mapper';
import { generateReceiptHTML, ReceiptTemplateData } from './templates/receiptTemplate';
import puppeteer from 'puppeteer';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { paginate } from '../utils/paginate';

// ═══════════════════════════════════════════════════════════════════════
// NOTE on embeddedProfile.mapper.ts (`shapeEmbeddedProfile`): the brief
// lists it among the utilities to use, but it is NOT used in this file --
// every Profile relation this service embeds (tenancy.userId's contact/
// detail selects, payments.recordedByUserId, generateReceipt's landlord
// name lookup) goes through an explicit narrow `select`, which excludes
// `legacyMongoId` by construction (confirmed by auditing every populate
// call site in the original Mongoose file: none of them are an unqualified
// `.populate('userId')`/`.populate('landlordId')` with no field-selection
// string). `shapeEmbeddedProfile` exists specifically for a FULL/unqualified
// Profile embed, which never occurs anywhere in billing.service.ts. Flagging
// explicitly (same as task-14's report did for `propertyRef.mapper.ts` not
// applying to public.service.ts) since the brief suggested it as a default.
// ═══════════════════════════════════════════════════════════════════════

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/**
 * Drops any null-valued key from a shallow object, mirroring Mongoose's
 * "unset optional path -> key entirely absent" convention (same pattern
 * every other ported service in this migration already uses).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════════════
// Strangler dual-id resolution.
//
// `billing.controller.ts`'s 11 call sites were swapped (per this task's
// brief) to pass `req.user!.pgId` -- the real Postgres UUID. But
// `payment.controller.ts` ALSO imports this file (`getPayments` /
// `getPaymentsByTenancy` -- see replay-id-resolver.ts's own comment: "
// `payment.json`'s cases are served by `billing.service.ts`"), and per the
// brief's scope ("Change billing.controller.ts's ... Nothing else in that
// controller; no other controller") that file is explicitly out of scope
// for this task, so its 2 call sites still pass `req.user!.id` -- the
// LEGACY MONGO OBJECTID for any profile that has one (see
// src/middleware/auth.ts). Left unresolved, `getPayments`/
// `getPaymentsByTenancy` would look up `prisma.profile.findUnique({where:
// {id: <mongo-objectid-string>}})`, which Postgres rejects outright (P2023,
// invalid UUID syntax) before ever reaching an OR-branch -- breaking every
// `payment.json` fixture, a regression this task's non-negotiables forbid.
//
// Rather than reach outside this file's declared scope to fix
// payment.controller.ts, every "resolve the caller" lookup in this file
// goes through this one resolver instead of a raw `prisma.profile.findUnique
// ({where:{id:userId}})`: try the UUID id first (this always succeeds for
// the 11 swapped billing.controller.ts sites), and fall back to
// `legacyMongoId` only when the incoming id isn't UUID-shaped at all (never
// attempting an `id: <mongo-id>` comparison, which is what would throw
// P2023). EVERY subsequent comparison/query in this file that needs "the
// caller's real Postgres id" then uses the RESOLVED `profile.id` -- never
// the raw `userId` parameter -- so a legacy-id caller (payment.controller.ts)
// and a pgId caller (billing.controller.ts) behave identically from this
// point on. Applied uniformly to all 13 exported functions (not just the
// 2 payment.controller.ts actually calls) so there is one pattern, not a
// special case per call site.
// ═══════════════════════════════════════════════════════════════════════
async function resolveCallerProfile(userId: string) {
  if (isValidId(userId)) {
    return prisma.profile.findUnique({ where: { id: userId } });
  }
  return prisma.profile.findUnique({ where: { legacyMongoId: userId } });
}

/**
 * Whether `staffId` is assigned to `propertyId` -- the direct replacement
 * for Mongoose's `user.assignedPropertyIds?.some(...)`, which lived
 * directly on the User document; in Postgres it's the
 * `staff_property_assignments` join table (same pattern duplicated in every
 * other ported service's own scoped-access checks).
 */
async function isStaffAssignedToProperty(staffId: string, propertyId: string): Promise<boolean> {
  const assignment = await prisma.staffPropertyAssignment.findUnique({
    where: { staffId_propertyId: { staffId, propertyId } },
  });
  return assignment !== null;
}

/**
 * Verify the caller is a landlord/staff with property access, or
 * super_admin. Direct Prisma port of the original -- message/statusCode
 * preserved exactly ('User not found'/404, 'Property not found'/404,
 * 'Access denied'/403). This is what makes `bill-by-id-denied-staff-finance`
 * correctly deny a finance staff member with no matching
 * `staff_property_assignments` row for this property.
 */
const verifyManagementAccess = async (userId: string, propertyId: string) => {
  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { statusCode: 404 });

  const isLandlord = property.landlordId === user.id;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(user.id, propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }
  return { user, property };
};

// ═══════════════════════════════════════════════════════════════════════
// tenancy embed -- shared by getBills/getBillById (unqualified
// `.populate('tenancyId', ...)` with a nested narrow `userId` populate) and
// generateReceipt. personalDetails/comments/householdMembers rebuild
// duplicated from tenancy.service.ts's own private helpers of the same name
// (that file exports nothing reusable, and this migration's established
// convention -- see contract.service.ts's own comment on this -- is to
// duplicate small per-file helpers rather than reach across service files).
// ═══════════════════════════════════════════════════════════════════════
interface PdColumns {
  pdFullName: string;
  pdPhone: string;
  pdOccupation: string;
  pdSchool: string | null;
  pdAddress: string;
  pdEmergencyName: string;
  pdEmergencyPhone: string;
  pdEmergencyRelationship: string;
}

function shapePersonalDetails(row: PdColumns): Record<string, unknown> {
  const personalDetails: Record<string, unknown> = {
    fullName: row.pdFullName,
    phone: row.pdPhone,
    occupation: row.pdOccupation,
  };
  if (row.pdSchool !== null && row.pdSchool !== undefined) {
    personalDetails.school = row.pdSchool;
  }
  personalDetails.address = row.pdAddress;
  personalDetails.emergencyContact = {
    name: row.pdEmergencyName,
    phone: row.pdEmergencyPhone,
    relationship: row.pdEmergencyRelationship,
  };
  return personalDetails;
}

type CommentRawRow = { id: string; userId: string; role: string; text: string; createdAt: Date };

function shapeCommentsRaw(rows: CommentRawRow[]): Record<string, unknown>[] {
  return rows.map((c) => ({ id: c.id, userId: c.userId, role: c.role, text: c.text, createdAt: c.createdAt }));
}

/** `.populate({path:'tenancyId', populate:{path:'userId', select:'name email avatar'}})` -- getBills only. */
const TENANCY_USER_LIST_SELECT = { id: true, name: true, email: true, avatar: true } satisfies Prisma.ProfileSelect;
/** `.populate({path:'tenancyId', populate:{path:'userId', select:'name email phone avatar'}})` -- getBillById only. */
const TENANCY_USER_DETAIL_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar: true,
} satisfies Prisma.ProfileSelect;
/** generateReceipt's own nested `.populate({path:'userId', select:'name phone'})`. */
const TENANCY_USER_RECEIPT_SELECT = { id: true, name: true, phone: true } satisfies Prisma.ProfileSelect;

/**
 * Rebuilds the embedded-tenancy shape from an unqualified `tenancy: {include:
 * {user: {select: ...}}}` row: personalDetails from the eight `pd_*` columns,
 * `householdMembers` defaulted to `[]` (nullable jsonb column with no
 * Mongoose-schema equivalent default -- same "always `[]`, never absent/null"
 * treatment tenancy.service.ts's own `withTenancyCore` established),
 * `comments` rebuilt from the included child rows, and the populated `user`
 * relation remapped back onto the `userId` key (object-literal key
 * precedence: `user` is destructured out of `rest`, which still carries the
 * raw scalar `userId`, then re-declared after -- same trick property.
 * service.ts's `remapLandlord` established in task 10). `propertyId`/
 * `unitId`/`contractId` are deliberately left as raw scalar FKs -- the
 * original's own tenancy populate never cascaded into them either.
 */
function shapeTenancyEmbed(row: Record<string, any>): Record<string, unknown> {
  const {
    pdFullName,
    pdPhone,
    pdOccupation,
    pdSchool,
    pdAddress,
    pdEmergencyName,
    pdEmergencyPhone,
    pdEmergencyRelationship,
    householdMembers,
    comments,
    user,
    ...rest
  } = row;

  const out: Record<string, unknown> = stripNulls(rest);
  out.householdMembers = householdMembers ?? [];
  out.personalDetails = shapePersonalDetails({
    pdFullName,
    pdPhone,
    pdOccupation,
    pdSchool,
    pdAddress,
    pdEmergencyName,
    pdEmergencyPhone,
    pdEmergencyRelationship,
  });
  out.comments = comments !== undefined ? shapeCommentsRaw(comments) : [];
  if (user) out.userId = stripNulls({ ...user });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// property/unit/contract narrow embeds -- FOUR distinct relation-shape
// groups existed in the original Mongoose code (getBills, getBillsByTenancy,
// getBillById, plus the payments.billId embed handled separately below) --
// kept as distinct select consts/shapers, per the established property.
// service.ts/contract.service.ts precedent: collapsing any of them would
// change response content and fail a fixture.
// ═══════════════════════════════════════════════════════════════════════

/** `.populate('propertyId', 'name address landlordId billingSettings')` -- getBillById only. */
const PROPERTY_BILLING_SELECT = {
  ...PROPERTY_REF_SELECT,
  landlordId: true,
  billingDay: true,
  dueDay: true,
  lateFeePercent: true,
  utilityDefault: true,
} satisfies Prisma.PropertySelect;

type PropertyBillingRow = Parameters<typeof shapePropertyRef>[0] & {
  landlordId: string;
  billingDay: number;
  dueDay: number;
  lateFeePercent: unknown;
  utilityDefault: string;
};

const shapePropertyWithBillingSettings = (row: PropertyBillingRow): Record<string, unknown> => ({
  ...shapePropertyRef(row),
  landlordId: row.landlordId,
  billingSettings: {
    billingDay: row.billingDay,
    dueDay: row.dueDay,
    lateFeePercent: row.lateFeePercent,
    utilityDefault: row.utilityDefault,
  },
});

/** `.populate('unitId', 'unitIdentifier accommodationType')` -- getBills + getBillById. */
const UNIT_BASIC_SELECT = { id: true, unitIdentifier: true, accommodationType: true } satisfies Prisma.UnitSelect;
/** `.populate('unitId', 'unitIdentifier')` -- getBillsByTenancy only (no accommodationType). */
const UNIT_IDENTIFIER_ONLY_SELECT = { id: true, unitIdentifier: true } satisfies Prisma.UnitSelect;

type UnitBasicRow = { id: string; unitIdentifier: string; accommodationType: string };
type UnitIdentifierRow = { id: string; unitIdentifier: string };

const shapeUnitBasic = (row: UnitBasicRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
  accommodationType: row.accommodationType,
});
const shapeUnitIdentifierOnly = (row: UnitIdentifierRow): Record<string, unknown> => ({
  id: row.id,
  unitIdentifier: row.unitIdentifier,
});

/** `.populate('contractId', 'monthlyRent startDate endDate')` -- getBills only. */
const CONTRACT_BILLS_LIST_SELECT = {
  id: true,
  startDate: true,
  endDate: true,
  monthlyRent: true,
} satisfies Prisma.ContractSelect;
/** `.populate('contractId', 'monthlyRent startDate endDate lockInPeriod')` -- getBillById only. */
const CONTRACT_BILL_DETAIL_SELECT = { ...CONTRACT_BILLS_LIST_SELECT, lockInPeriod: true } satisfies Prisma.ContractSelect;

type ContractBillsListRow = { id: string; startDate: Date; endDate: Date; monthlyRent: unknown };
type ContractBillDetailRow = ContractBillsListRow & { lockInPeriod: number };

const shapeContractBillsList = (row: ContractBillsListRow): Record<string, unknown> => ({
  id: row.id,
  startDate: row.startDate,
  endDate: row.endDate,
  monthlyRent: row.monthlyRent,
});
const shapeContractBillDetail = (row: ContractBillDetailRow): Record<string, unknown> => ({
  ...shapeContractBillsList(row),
  lockInPeriod: row.lockInPeriod,
});

// ═══════════════════════════════════════════════════════════════════════
// utilityBreakdown -- Mongoose's `UtilityBreakdownSchema` (server/src/models
// /Bill.ts) defines electricity/water/internet/others as four SINGLE NESTED
// sub-schemas, each with its own `amount: {type:Number, default:0}`. Mongoose
// auto-materializes a default `{}` (hence `{amount:0}` after its own default
// applies) for any one of those four sub-paths that a document didn't
// explicitly set, AS LONG AS the parent `utilityBreakdown` path itself was
// set at all. Confirmed empirically, not assumed: `server/src/seeds/
// seed-postgres.ts`'s three seeded utility bills set only `electricity`/
// `water`/`internet` in their jsonb literal (grepped -- zero `others` keys
// anywhere in that file), yet every `billing.json` fixture that surfaces
// `utilityBreakdown` shows `others: {amount: 0}` present regardless -- that
// is Mongoose's own schema default from the ORIGINAL Mongo capture, not
// something the Postgres seed reproduced (jsonb has no schema, so it just
// stored the four keys given). Ported here as an explicit read-side rebuild,
// the same category of fix as property.service.ts's billingSettings/
// geoCoords ("this sub-object always existed in Mongoose (schema defaults)
// -- so it's always rebuilt", task-10-report.md) -- NOT a seed-data gap to
// route around, and NOT something this task is authorized to patch by
// editing the seed script anyway.
// ═══════════════════════════════════════════════════════════════════════
function shapeUtilityBreakdown(raw: unknown): Record<string, unknown> | undefined {
  if (raw === null || raw === undefined) return undefined;
  const r = raw as Record<string, unknown>;
  return {
    electricity: r.electricity ?? { amount: 0 },
    water: r.water ?? { amount: 0 },
    internet: r.internet ?? { amount: 0 },
    others: r.others ?? { amount: 0 },
  };
}

/**
 * Column-reshape step shared by every bill-row remap variant below,
 * orthogonal to relation remapping (property.service.ts's established
 * split, task 10): rebuilds `billingPeriod` from the two flattened
 * `billingPeriodStart`/`billingPeriodEnd` columns and normalizes
 * `utilityBreakdown` (see above). Leaves `tenancy`/`property`/`unit`/
 * `contract` relation keys (when present) untouched for the caller's own
 * remap step. Money columns (`rentAmount`/`utilityAmount`/`penaltyAmount`/
 * `totalAmount`/`paidAmount`/`balanceAmount`) are NOT touched here -- they
 * stay `Prisma.Decimal` instances all the way to `serializeDoc`, which is
 * the only place in this file that ever converts money to a plain number.
 */
function shapeBillCore(row: Record<string, any>): Record<string, unknown> {
  const { billingPeriodStart, billingPeriodEnd, utilityBreakdown, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  out.billingPeriod = { start: billingPeriodStart, end: billingPeriodEnd };
  const normalizedBreakdown = shapeUtilityBreakdown(utilityBreakdown);
  if (normalizedBreakdown !== undefined) out.utilityBreakdown = normalizedBreakdown;
  return out;
}

/** Remaps getBills rows: `tenancyId` (full embed, list-user) + `propertyId` (ref) + `unitId` (basic) + `contractId` (bills-list). */
function remapBillsListRow(row: Record<string, any>): Record<string, unknown> {
  const core = shapeBillCore(row);
  const { tenancy, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (tenancy) out.tenancyId = shapeTenancyEmbed(tenancy);
  if (property) out.propertyId = shapePropertyRef(property);
  if (unit) out.unitId = shapeUnitBasic(unit);
  if (contract) out.contractId = shapeContractBillsList(contract);
  return out;
}

/** Remaps getBillsByTenancy rows: `tenancyId`/`contractId` stay raw scalars (never populated here, matches original) + `propertyId` (ref) + `unitId` (identifier-only). */
function remapBillsByTenancyRow(row: Record<string, any>): Record<string, unknown> {
  const core = shapeBillCore(row);
  const { property, unit, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (property) out.propertyId = shapePropertyRef(property);
  if (unit) out.unitId = shapeUnitIdentifierOnly(unit);
  return out;
}

/** Remaps getBillById's row: `tenancyId` (full embed, detail-user) + `propertyId` (+landlordId/billingSettings) + `unitId` (basic) + `contractId` (+lockInPeriod). */
function remapBillByIdRow(row: Record<string, any>): Record<string, unknown> {
  const core = shapeBillCore(row);
  const { tenancy, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (tenancy) out.tenancyId = shapeTenancyEmbed(tenancy);
  if (property) out.propertyId = shapePropertyWithBillingSettings(property);
  if (unit) out.unitId = shapeUnitBasic(unit);
  if (contract) out.contractId = shapeContractBillDetail(contract);
  return out;
}

/**
 * Remaps the full, unqualified `.populate('propertyId')`/`.populate('unitId')`
 * shape used only by generateReceipt's returned `bill` (and, internally,
 * confirmCheckin-style full-row reads elsewhere in this migration) -- no
 * golden fixture exercises generateReceipt's content (see that function's
 * own comment), so this is a faithful-effort port, not fixture-verified.
 * `property`/`unit` are raw `stripNulls({...row})` dumps (neither carries a
 * `legacyMongoId` column, so no leak risk); `tenancy` reuses
 * `shapeTenancyEmbed` for the same personalDetails/comments/householdMembers
 * rebuild as every other tenancy embed in this file.
 */
function remapFullBillEmbed(row: Record<string, any>): Record<string, unknown> {
  const core = shapeBillCore(row);
  const { tenancy, property, unit, contract, ...rest } = core as any;
  const out: Record<string, unknown> = rest;
  if (tenancy) out.tenancyId = shapeTenancyEmbed(tenancy);
  if (property) out.propertyId = stripNulls({ ...property });
  if (unit) out.unitId = stripNulls({ ...unit });
  if (contract) out.contractId = stripNulls({ ...contract });
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// Payment embeds. TWO distinct shapes: getBillById's own `payments` array
// (billId/tenancyId stay RAW scalars -- the original's
// `Payment.find({billId}).populate('recordedByUserId','name')` never
// populates `billId` at all) vs getPayments/getPaymentsByTenancy (billId
// IS populated, narrow, with/without `dueDate`).
// ═══════════════════════════════════════════════════════════════════════
const PAYMENT_RECORDED_BY_SELECT = { id: true, name: true } satisfies Prisma.ProfileSelect;

/** getBillById's own payments array: `recordedByUserId` (name only), `billId`/`tenancyId` left raw. */
function remapPaymentForBillDetail(row: Record<string, any>): Record<string, unknown> {
  const { recordedBy, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (recordedBy) out.recordedByUserId = stripNulls({ id: recordedBy.id, name: recordedBy.name });
  return out;
}

/** `.populate('billId', 'type billingPeriod totalAmount status[ dueDate]')` -- getPayments/getPaymentsByTenancy. */
const PAYMENT_BILL_LIST_SELECT = {
  id: true,
  type: true,
  billingPeriodStart: true,
  billingPeriodEnd: true,
  totalAmount: true,
  status: true,
} satisfies Prisma.BillSelect;
const PAYMENT_BILL_TENANCY_SELECT = { ...PAYMENT_BILL_LIST_SELECT, dueDate: true } satisfies Prisma.BillSelect;

function shapeBillRefForPayment(row: Record<string, any>): Record<string, unknown> {
  const { billingPeriodStart, billingPeriodEnd, ...rest } = row;
  return { ...rest, billingPeriod: { start: billingPeriodStart, end: billingPeriodEnd } };
}

/** Remaps getPayments/getPaymentsByTenancy rows: `billId` (narrow) + `recordedByUserId` (name only). `tenancyId` stays raw (matches original). */
function remapPaymentRow(row: Record<string, any>): Record<string, unknown> {
  const { bill, recordedBy, ...rest } = row;
  const out: Record<string, unknown> = stripNulls(rest);
  if (bill) out.billId = shapeBillRefForPayment(bill);
  if (recordedBy) out.recordedByUserId = stripNulls({ id: recordedBy.id, name: recordedBy.name });
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Date helpers (no money involved -- left as plain Date arithmetic).
// ─────────────────────────────────────────────────────────────

/** Compute billing period for a given month/year. */
const computeBillingPeriod = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return { start, end };
};

/** Compute due date from property billing settings. */
const computeDueDate = (year: number, month: number, dueDay: number): Date => {
  const maxDay = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, maxDay);
  return new Date(year, month - 1, day);
};

// ─────────────────────────────────────────────────────────────
//  Money helpers -- Prisma.Decimal end-to-end. Every function below
//  computes with Prisma.Decimal, never a JS float; `.toNumber()` is used
//  ONLY (a) inside a jsonb sub-document that was never a Decimal-typed
//  column even under Mongoose (utilityBreakdown's own numbers), or (b)
//  inside a notification/error MESSAGE string (display text, not a stored
//  value) -- never to compute a Bill's own Decimal columns.
// ─────────────────────────────────────────────────────────────

const ZERO = new Prisma.Decimal(0);

type ReadingInput = {
  previousReading: number;
  currentReading: number;
  rate: number;
};

type UtilityBillInput = {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  allocationMode?: 'full' | 'per_head';
  utilityBreakdown: {
    electricity?: ReadingInput;
    water?: ReadingInput;
    internet?: { amount: number };
    others?: { description?: string; amount: number };
  };
  notes?: string;
};

type CombinedBillInput = {
  tenancyId: string;
  billingPeriod: { start: string; end: string };
  dueDate: string;
  rentAmount: number;
  utilityBreakdown?: UtilityBillInput['utilityBreakdown'];
  allocationMode?: 'full' | 'per_head';
  penaltyAmount?: number;
  notes?: string;
};

interface ReadingCharge {
  previousReading: number;
  currentReading: number;
  consumption: Prisma.Decimal;
  rate: number;
  amount: Prisma.Decimal;
}

const computeReadingCharge = (reading?: ReadingInput): ReadingCharge | undefined => {
  if (!reading) return undefined;
  if (reading.currentReading < reading.previousReading) {
    throw Object.assign(new Error('Current reading cannot be lower than previous reading'), { statusCode: 400 });
  }

  const previous = new Prisma.Decimal(reading.previousReading);
  const current = new Prisma.Decimal(reading.currentReading);
  const rate = new Prisma.Decimal(reading.rate);
  const consumption = current.minus(previous).toDecimalPlaces(2);
  const amount = consumption.times(rate).toDecimalPlaces(2);

  return { previousReading: reading.previousReading, currentReading: reading.currentReading, consumption, rate: reading.rate, amount };
};

/** Converts a computed reading charge (Decimal internals) into the plain-number shape stored in the `utility_breakdown` jsonb column -- the terminal point for these Decimal values, not used in further arithmetic afterward. */
function readingToJSON(rc: ReadingCharge | undefined): Record<string, unknown> | undefined {
  if (!rc) return undefined;
  return {
    previousReading: rc.previousReading,
    currentReading: rc.currentReading,
    consumption: rc.consumption.toNumber(),
    rate: rc.rate,
    amount: rc.amount.toNumber(),
  };
}

interface UtilityComputation {
  utilityAmount: Prisma.Decimal;
  utilityBreakdownJSON: Record<string, unknown>;
  allocationNote?: string;
}

const getUtilityComputation = async (
  tenancy: { unitId: string },
  data: UtilityBillInput | CombinedBillInput
): Promise<UtilityComputation> => {
  const allocationMode = data.allocationMode || 'full';
  const utilityBreakdownInput = (data as UtilityBillInput).utilityBreakdown || {};
  const electricity = computeReadingCharge(utilityBreakdownInput.electricity);
  const water = computeReadingCharge(utilityBreakdownInput.water);
  const internet = utilityBreakdownInput.internet
    ? { amount: new Prisma.Decimal(utilityBreakdownInput.internet.amount || 0).toDecimalPlaces(2) }
    : undefined;
  const others = utilityBreakdownInput.others
    ? {
        description: utilityBreakdownInput.others.description,
        amount: new Prisma.Decimal(utilityBreakdownInput.others.amount || 0).toDecimalPlaces(2),
      }
    : undefined;

  const totalUtility = (electricity?.amount ?? ZERO)
    .plus(water?.amount ?? ZERO)
    .plus(internet?.amount ?? ZERO)
    .plus(others?.amount ?? ZERO);

  let allocationNote: string | undefined;
  let billedUtilityAmount = totalUtility;

  if (allocationMode === 'per_head') {
    const occupants = await prisma.tenancy.count({ where: { unitId: tenancy.unitId, status: 'checked_in' } });
    if (occupants <= 0) {
      throw Object.assign(new Error('No checked-in occupants found for per-head allocation'), { statusCode: 400 });
    }
    billedUtilityAmount = totalUtility.dividedBy(occupants).toDecimalPlaces(2);
    allocationNote = `Shared utility: total ₱${totalUtility.toNumber().toLocaleString('en-PH', { minimumFractionDigits: 2 })} divided by ${occupants} occupant(s) = ₱${billedUtilityAmount.toNumber().toLocaleString('en-PH', { minimumFractionDigits: 2 })} per occupant`;
  }

  return {
    utilityAmount: billedUtilityAmount,
    utilityBreakdownJSON: {
      ...(electricity ? { electricity: readingToJSON(electricity) } : {}),
      ...(water ? { water: readingToJSON(water) } : {}),
      ...(internet ? { internet: { amount: internet.amount.toNumber() } } : {}),
      ...(others
        ? {
            others: {
              ...(others.description !== undefined ? { description: others.description } : {}),
              amount: others.amount.toNumber(),
            },
          }
        : {}),
    },
    allocationNote,
  };
};

/** Generate a receipt number: RD-YYYYMMDD-XXXXX */
const generateReceiptNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.payment.count();
  const seq = String(count + 1).padStart(5, '0');
  return `RD-${dateStr}-${seq}`;
};

/**
 * Loads a tenancy (with its property) for the three create*Bill functions.
 * Applies the task-14 invalid-id pattern preemptively -- no golden fixture
 * forces it on these write paths, but it closes the same malformed-UUID-
 * to-P2023-to-500 trap the read paths guard against, at zero cost.
 */
async function loadTenancyForBillCreate(tenancyId: string) {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }
  const tenancy = await prisma.tenancy.findUnique({ where: { id: tenancyId }, include: { property: true } });
  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }
  return tenancy;
}

// ─────────────────────────────────────────────────────────────
//  Auto-generate monthly bills (cron-driven; no fixture coverage -- see
//  the brief's item 5 and the README-style note above autoGenerateMonthlyBills
//  itself).
// ─────────────────────────────────────────────────────────────

export const autoGenerateMonthlyBills = async (
  userId: string,
  targetMonth?: number,
  targetYear?: number
) => {
  const now = new Date();
  const month = targetMonth || now.getMonth() + 1;
  const year = targetYear || now.getFullYear();

  // Find all active tenancies (unqualified populate of propertyId/unitId/contractId).
  const tenancies = await prisma.tenancy.findMany({
    where: { status: 'checked_in' },
    include: { property: true, unit: true, contract: true },
  });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const tenancy of tenancies) {
    try {
      const contract = tenancy.contract;
      const property = tenancy.property;
      const unit = tenancy.unit;

      if (!contract || !property) {
        results.skipped++;
        continue;
      }

      const { start, end } = computeBillingPeriod(year, month);
      const dueDay = property.dueDay ?? 5;
      const dueDate = computeDueDate(year, month, dueDay);

      // Check for existing bill (the explicit, friendlier-error guard --
      // kept per the brief's item 1 -- ahead of the DB-level
      // `bills_auto_period_uniq` partial unique index, which now enforces
      // the same invariant for the TOCTOU race this check alone can't close).
      const existing = await prisma.bill.findFirst({
        where: { tenancyId: tenancy.id, type: 'rent', isAutoGenerated: true, billingPeriodStart: start, billingPeriodEnd: end },
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      const rentAmount = new Prisma.Decimal(contract.monthlyRent);

      try {
        // Two writes under Mongoose (Bill.create + Notification.create) with
        // no atomicity between them -- wrapped in one prisma.$transaction,
        // same pattern as every other create-plus-notify path in this
        // migration.
        await prisma.$transaction(async (tx) => {
          const created = await tx.bill.create({
            data: {
              tenancyId: tenancy.id,
              propertyId: property.id,
              unitId: unit.id,
              contractId: contract.id,
              type: 'rent',
              billingPeriodStart: start,
              billingPeriodEnd: end,
              rentAmount,
              utilityAmount: 0,
              penaltyAmount: 0,
              totalAmount: rentAmount,
              paidAmount: 0,
              balanceAmount: rentAmount,
              status: 'unpaid',
              dueDate,
              isAutoGenerated: true,
            },
          });

          await tx.notification.create({
            data: {
              userId: tenancy.userId,
              type: 'billing',
              title: 'New Bill Generated',
              message: `Your rent bill for ${start.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })} has been generated. Amount: ₱${rentAmount.toNumber().toLocaleString()}. Due: ${dueDate.toLocaleDateString('en-PH')}.`,
              link: '/u/my-bills',
              metadata: { tenancyId: tenancy.id, propertyId: property.id },
            },
          });

          return created;
        });

        results.created++;
      } catch (err: any) {
        // Brief item 1: an escaping P2002 (the `bills_auto_period_uniq`
        // partial unique index, tripped by a genuine TOCTOU race between the
        // pre-check above and this create) maps to the SAME outcome the
        // pre-check already gives the common case -- "skipped" -- rather
        // than leaking a raw Prisma error into `results.errors`.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          results.skipped++;
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      results.errors.push(`Tenancy ${tenancy.id}: ${err.message}`);
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────────────
//  Create manual bill
// ─────────────────────────────────────────────────────────────

export const createManualBill = async (userId: string, data: {
  tenancyId: string;
  type: string;
  billingPeriod: { start: string; end: string };
  rentAmount?: number;
  utilityAmount?: number;
  penaltyAmount?: number;
  dueDate: string;
  utilityBreakdown?: any;
  notes?: string;
}) => {
  const tenancy = await loadTenancyForBillCreate(data.tenancyId);
  await verifyManagementAccess(userId, tenancy.property.id);

  const rentAmount = new Prisma.Decimal(data.rentAmount ?? 0);
  const utilityAmount = new Prisma.Decimal(data.utilityAmount ?? 0);
  const penaltyAmount = new Prisma.Decimal(data.penaltyAmount ?? 0);
  const totalAmount = rentAmount.plus(utilityAmount).plus(penaltyAmount);

  try {
    // Two writes (Bill.create + Notification.create), no atomicity under
    // Mongoose -- wrapped in one prisma.$transaction (brief item 2, this
    // function named explicitly as one of "the three create*Bill functions").
    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          tenancyId: tenancy.id,
          propertyId: tenancy.property.id,
          unitId: tenancy.unitId,
          contractId: tenancy.contractId,
          type: data.type as Prisma.BillCreateInput['type'],
          billingPeriodStart: new Date(data.billingPeriod.start),
          billingPeriodEnd: new Date(data.billingPeriod.end),
          rentAmount,
          utilityAmount,
          penaltyAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          status: 'unpaid',
          dueDate: new Date(data.dueDate),
          utilityBreakdown: data.utilityBreakdown,
          isAutoGenerated: false,
          notes: data.notes,
        },
      });

      await tx.notification.create({
        data: {
          userId: tenancy.userId,
          type: 'billing',
          title: 'New Bill',
          message: `A new ${data.type} bill has been created. Amount: ₱${totalAmount.toNumber().toLocaleString()}.`,
          link: '/u/my-bills',
          metadata: { billId: created.id },
        },
      });

      return created;
    });

    return serializeDoc(bill);
  } catch (e) {
    throw toHttpError(e);
  }
};

export const createUtilityBill = async (userId: string, data: UtilityBillInput) => {
  const tenancy = await loadTenancyForBillCreate(data.tenancyId);
  await verifyManagementAccess(userId, tenancy.property.id);

  const computation = await getUtilityComputation(tenancy, data);
  const notes = [data.notes, computation.allocationNote].filter(Boolean).join('\n');

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          tenancyId: tenancy.id,
          propertyId: tenancy.property.id,
          unitId: tenancy.unitId,
          contractId: tenancy.contractId,
          type: 'utility',
          billingPeriodStart: new Date(data.billingPeriod.start),
          billingPeriodEnd: new Date(data.billingPeriod.end),
          rentAmount: 0,
          utilityAmount: computation.utilityAmount,
          penaltyAmount: 0,
          totalAmount: computation.utilityAmount,
          paidAmount: 0,
          balanceAmount: computation.utilityAmount,
          status: 'unpaid',
          dueDate: new Date(data.dueDate),
          utilityBreakdown: computation.utilityBreakdownJSON as Prisma.InputJsonValue,
          isAutoGenerated: false,
          notes: notes || undefined,
        },
      });

      await tx.notification.create({
        data: {
          userId: tenancy.userId,
          type: 'billing',
          title: 'Utility Bill Generated',
          message: `A new utility bill has been created. Amount: ₱${computation.utilityAmount.toNumber().toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
          link: '/u/my-bills',
          metadata: { billId: created.id },
        },
      });

      return created;
    });

    return serializeDoc(bill);
  } catch (e) {
    throw toHttpError(e);
  }
};

export const createCombinedBill = async (userId: string, data: CombinedBillInput) => {
  const tenancy = await loadTenancyForBillCreate(data.tenancyId);
  await verifyManagementAccess(userId, tenancy.property.id);

  const utilityComputation = await getUtilityComputation(tenancy, {
    tenancyId: data.tenancyId,
    billingPeriod: data.billingPeriod,
    dueDate: data.dueDate,
    allocationMode: data.allocationMode,
    utilityBreakdown: data.utilityBreakdown || {},
    notes: data.notes,
  });

  const penaltyAmount = new Prisma.Decimal(data.penaltyAmount ?? 0).toDecimalPlaces(2);
  const rentAmount = new Prisma.Decimal(data.rentAmount ?? 0).toDecimalPlaces(2);
  const totalAmount = rentAmount.plus(utilityComputation.utilityAmount).plus(penaltyAmount);
  const notes = [data.notes, utilityComputation.allocationNote].filter(Boolean).join('\n');

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          tenancyId: tenancy.id,
          propertyId: tenancy.property.id,
          unitId: tenancy.unitId,
          contractId: tenancy.contractId,
          type: 'combined',
          billingPeriodStart: new Date(data.billingPeriod.start),
          billingPeriodEnd: new Date(data.billingPeriod.end),
          rentAmount,
          utilityAmount: utilityComputation.utilityAmount,
          penaltyAmount,
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          status: 'unpaid',
          dueDate: new Date(data.dueDate),
          utilityBreakdown: utilityComputation.utilityBreakdownJSON as Prisma.InputJsonValue,
          isAutoGenerated: false,
          notes: notes || undefined,
        },
      });

      await tx.notification.create({
        data: {
          userId: tenancy.userId,
          type: 'billing',
          title: 'Combined Bill Generated',
          message: `A combined rent + utility bill has been created. Total: ₱${totalAmount.toNumber().toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
          link: '/u/my-bills',
          metadata: { billId: created.id },
        },
      });

      return created;
    });

    return serializeDoc(bill);
  } catch (e) {
    throw toHttpError(e);
  }
};

// ─────────────────────────────────────────────────────────────
//  Record payment
//
//  WRITE SET (both inside one prisma.$transaction):
//    1. payment.create          -- the new Payment row
//    2. bill.update              -- paidAmount/balanceAmount/status
//    (+ notification.create, same transaction)
//  Under Mongoose these were independent document writes with NO
//  atomicity: a crash after step 1 could leave a payment recorded without
//  the parent bill ever reflecting it. This is the sixth such fix in this
//  migration (brief item 2) -- a real correctness fix, not a mechanical
//  translation.
// ─────────────────────────────────────────────────────────────

export const recordPayment = async (userId: string, billId: string, data: {
  amount: number;
  method: string;
  paymentDate?: string;
  referenceNumber?: string;
  proofImageUrl?: string;
  notes?: string;
}) => {
  if (!isValidId(billId)) {
    throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  }

  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId);

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Bill is already fully paid'), { statusCode: 400 });
  }

  const amount = new Prisma.Decimal(data.amount);

  if (amount.lessThanOrEqualTo(0)) {
    throw Object.assign(new Error('Payment amount must be greater than zero'), { statusCode: 400 });
  }

  if (amount.greaterThan(bill.balanceAmount)) {
    throw Object.assign(
      new Error(`Payment amount (₱${data.amount}) exceeds balance (₱${Number(bill.balanceAmount)})`),
      { statusCode: 400 }
    );
  }

  try {
    const { payment, bill: updatedBill } = await prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          billId: bill.id,
          tenancyId: bill.tenancyId,
          amount,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          method: data.method as Prisma.PaymentCreateInput['method'],
          referenceNumber: data.referenceNumber,
          proofImageUrl: data.proofImageUrl,
          recordedByUserId: userId,
          notes: data.notes,
        },
      });

      // Decimal arithmetic all the way through: paidAmount + balanceAmount
      // stays exactly equal to totalAmount, no float drift (e.g. a 0.10 +
      // 0.20 style rounding error compounding across many payments).
      const newPaidAmount = new Prisma.Decimal(bill.paidAmount).plus(amount);
      const newBalanceAmount = new Prisma.Decimal(bill.totalAmount).minus(newPaidAmount);
      const newStatus: Prisma.BillUpdateInput['status'] = newBalanceAmount.lessThanOrEqualTo(0) ? 'paid' : 'partial';

      const updated = await tx.bill.update({
        where: { id: bill.id },
        data: { paidAmount: newPaidAmount, balanceAmount: newBalanceAmount, status: newStatus },
      });

      const tenancy = await tx.tenancy.findUnique({ where: { id: bill.tenancyId }, select: { userId: true } });
      if (tenancy) {
        await tx.notification.create({
          data: {
            userId: tenancy.userId,
            type: 'billing',
            title: 'Payment Recorded',
            message: `A payment of ₱${data.amount.toLocaleString()} has been recorded. ${updated.status === 'paid' ? 'Your bill is now fully paid!' : `Remaining balance: ₱${Number(updated.balanceAmount).toLocaleString()}`}`,
            link: '/u/my-bills',
            metadata: { billId: updated.id, paymentId: createdPayment.id },
          },
        });
      }

      return { payment: createdPayment, bill: updated };
    });

    // Non-null assertions: `payment`/`updatedBill` are freshly created/updated
    // Prisma rows from this same transaction, never actually null --
    // `serializeDoc`'s signature is `(doc: T | null): ... | null` purely to
    // support callers that DO pass a possibly-missing doc (e.g. `findUnique`
    // results elsewhere in this file); it doesn't narrow on argument
    // nullability, so TS still widens the return type here unless asserted.
    return { payment: serializeDoc(payment)!, bill: serializeDoc(updatedBill)! };
  } catch (e) {
    throw toHttpError(e);
  }
};

// ─────────────────────────────────────────────────────────────
//  Apply late fee
// ─────────────────────────────────────────────────────────────

export const applyLateFee = async (userId: string, billId: string) => {
  if (!isValidId(billId)) {
    throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: { property: { select: { lateFeePercent: true } } },
  });
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId);

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Cannot apply late fee to a fully paid bill'), { statusCode: 400 });
  }

  const now = new Date();
  if (now <= bill.dueDate) {
    throw Object.assign(new Error('Bill is not yet past due'), { statusCode: 400 });
  }

  const lateFeePercent = new Prisma.Decimal(bill.property.lateFeePercent);
  const penaltyIncrement = new Prisma.Decimal(bill.rentAmount)
    .plus(bill.utilityAmount)
    .times(lateFeePercent)
    .dividedBy(100)
    .toDecimalPlaces(2);
  const newPenaltyAmount = new Prisma.Decimal(bill.penaltyAmount).plus(penaltyIncrement);
  const newTotalAmount = new Prisma.Decimal(bill.rentAmount).plus(bill.utilityAmount).plus(newPenaltyAmount);
  const newBalanceAmount = newTotalAmount.minus(bill.paidAmount);

  try {
    // bill.update + notification.create: two writes, no atomicity under
    // Mongoose -- wrapped in one prisma.$transaction (brief item 2, this
    // function named explicitly).
    const updated = await prisma.$transaction(async (tx) => {
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          penaltyAmount: newPenaltyAmount,
          totalAmount: newTotalAmount,
          balanceAmount: newBalanceAmount,
          status: 'overdue',
        },
      });

      const tenancy = await tx.tenancy.findUnique({ where: { id: bill.tenancyId }, select: { userId: true } });
      if (tenancy) {
        await tx.notification.create({
          data: {
            userId: tenancy.userId,
            type: 'billing',
            title: 'Late Fee Applied',
            message: `A late fee of ₱${penaltyIncrement.toNumber().toLocaleString()} (${lateFeePercent.toNumber()}%) has been applied to your overdue bill. New total: ₱${newTotalAmount.toNumber().toLocaleString()}.`,
            link: '/u/my-bills',
            metadata: { billId: updatedBill.id },
          },
        });
      }

      return updatedBill;
    });

    return serializeDoc(updated);
  } catch (e) {
    throw toHttpError(e);
  }
};

// ─────────────────────────────────────────────────────────────
//  Update bill
// ─────────────────────────────────────────────────────────────

export const updateBill = async (userId: string, billId: string, updates: {
  rentAmount?: number;
  utilityAmount?: number;
  penaltyAmount?: number;
  dueDate?: string;
  utilityBreakdown?: any;
  notes?: string;
}) => {
  if (!isValidId(billId)) {
    throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  }

  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId);

  if (bill.status === 'paid') {
    throw Object.assign(new Error('Cannot update a fully paid bill'), { statusCode: 400 });
  }

  const rentAmount = updates.rentAmount !== undefined ? new Prisma.Decimal(updates.rentAmount) : new Prisma.Decimal(bill.rentAmount);
  const utilityAmount = updates.utilityAmount !== undefined ? new Prisma.Decimal(updates.utilityAmount) : new Prisma.Decimal(bill.utilityAmount);
  const penaltyAmount = updates.penaltyAmount !== undefined ? new Prisma.Decimal(updates.penaltyAmount) : new Prisma.Decimal(bill.penaltyAmount);
  const totalAmount = rentAmount.plus(utilityAmount).plus(penaltyAmount);
  const balanceAmount = totalAmount.minus(bill.paidAmount);

  let status: Prisma.BillUpdateInput['status'];
  if (balanceAmount.lessThanOrEqualTo(0)) status = 'paid';
  else if (new Prisma.Decimal(bill.paidAmount).greaterThan(0)) status = 'partial';
  else status = 'unpaid';

  const data: Prisma.BillUpdateInput = { rentAmount, utilityAmount, penaltyAmount, totalAmount, balanceAmount, status };
  if (updates.dueDate) data.dueDate = new Date(updates.dueDate);
  if (updates.utilityBreakdown) data.utilityBreakdown = updates.utilityBreakdown;
  if (updates.notes !== undefined) data.notes = updates.notes;

  try {
    // Single write (amounts/status update only, no notification in the
    // original) -- no transaction needed, same as contract.service.ts's
    // updateContract precedent.
    const updated = await prisma.bill.update({ where: { id: bill.id }, data });
    return serializeDoc(updated);
  } catch (e) {
    throw toHttpError(e);
  }
};

// ─────────────────────────────────────────────────────────────
//  Generate receipt PDF (puppeteer + Cloudinary). Only the database reads
//  and the final `documentUrl`-equivalent (`receiptUrl`) write are ported --
//  the puppeteer launch/HTML templating/Cloudinary upload are UNCHANGED, per
//  the brief. This route was deliberately excluded from fixture capture
//  (it mutates despite being a GET) -- ported carefully, but not
//  fixture-verified.
// ─────────────────────────────────────────────────────────────

export const generateReceipt = async (userId: string, billId: string) => {
  if (!isValidId(billId)) {
    throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      tenancy: {
        include: {
          user: { select: TENANCY_USER_RECEIPT_SELECT },
          comments: { orderBy: { createdAt: 'asc' } },
        },
      },
      property: true,
      unit: true,
    },
  });

  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  await verifyManagementAccess(userId, bill.propertyId);

  // Get the latest payment for this bill (sorted by createdAt desc, matching original).
  const latestPayment = await prisma.payment.findFirst({
    where: { billId },
    orderBy: { createdAt: 'desc' },
    include: { recordedBy: { select: { id: true, name: true } } },
  });

  if (!latestPayment) {
    throw Object.assign(new Error('No payments recorded for this bill yet'), { statusCode: 400 });
  }

  const receiptNumber = await generateReceiptNumber();
  const tenancy = bill.tenancy;
  const tenant = tenancy.user;
  const property = bill.property;
  const unit = bill.unit;

  const propertyAddress = [
    property.street, property.barangay,
    property.city, property.province, property.zipCode
  ].filter(Boolean).join(', ');

  const periodStart = bill.billingPeriodStart.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const periodEnd = bill.billingPeriodEnd.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const billingPeriod = periodStart === periodEnd ? periodStart : `${periodStart} — ${periodEnd}`;

  const landlord = await prisma.profile.findUnique({ where: { id: property.landlordId } });

  const normalizedBreakdown = shapeUtilityBreakdown(bill.utilityBreakdown);

  // ── Boundary: templateData is a display artifact (PDF/HTML), not the API
  // response -- converting to plain numbers HERE (not before) is the same
  // "only at the consumption boundary" rule generatePDF's own port
  // (contract.service.ts) already applies for the same reason. ──
  const templateData: ReceiptTemplateData = {
    receiptNumber,
    paymentDate: latestPayment.paymentDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    tenantName: tenant.name,
    tenantPhone: tenant.phone || '',
    propertyName: property.name,
    propertyAddress,
    unitIdentifier: unit.unitIdentifier,
    landlordName: landlord?.name || 'Landlord',
    billType: bill.type,
    billingPeriod,
    rentAmount: Number(bill.rentAmount),
    utilityAmount: Number(bill.utilityAmount),
    penaltyAmount: Number(bill.penaltyAmount),
    totalAmount: Number(bill.totalAmount),
    paidAmount: Number(bill.paidAmount),
    balanceAmount: Number(bill.balanceAmount),
    paymentAmount: Number(latestPayment.amount),
    paymentMethod: latestPayment.method,
    referenceNumber: latestPayment.referenceNumber ?? undefined,
    recordedBy: latestPayment.recordedBy?.name || 'System',
    notes: latestPayment.notes ?? undefined,
    utilityBreakdown: (normalizedBreakdown as ReceiptTemplateData['utilityBreakdown']) ?? undefined,
  };

  const html = generateReceiptHTML(templateData);

  // ─────────────────────────────────────────────────────────────────────
  // Puppeteer / Cloudinary section: UNCHANGED per the brief. Only the DB
  // reads above and the final write below are ported.
  // ─────────────────────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const tempDir = os.tmpdir();
  const pdfPath = path.join(tempDir, `receipt-${bill.id}-${Date.now()}.pdf`);

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });

  await browser.close();

  const uploadResult = await cloudinary.uploader.upload(pdfPath, {
    folder: 'rentdito/receipts',
    resource_type: 'raw',
    public_id: `receipt-${bill.id}-${Date.now()}`,
    overwrite: true
  });

  fs.unlinkSync(pdfPath);
  // ─────────────────────────────────────────────────────────────────────
  // Back to porting: single write, no notification in the original, no
  // transaction needed.
  // ─────────────────────────────────────────────────────────────────────

  const updated = await prisma.bill.update({
    where: { id: bill.id },
    data: { receiptUrl: uploadResult.secure_url },
    include: {
      tenancy: {
        include: {
          user: { select: TENANCY_USER_RECEIPT_SELECT },
          comments: { orderBy: { createdAt: 'asc' } },
        },
      },
      property: true,
      unit: true,
    },
  });

  return { receiptUrl: uploadResult.secure_url, bill: serializeDoc(remapFullBillEmbed(updated)) };
};

// ─────────────────────────────────────────────────────────────
//  Read operations
// ─────────────────────────────────────────────────────────────

export const getBills = async (userId: string, filters: {
  status?: string; propertyId?: string; tenancyId?: string; type?: string;
  page?: number; limit?: number;
} = {}) => {
  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let propertyFilter: Prisma.BillWhereInput = {};

  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({ where: { landlordId: user.id }, select: { id: true } });
    propertyFilter = { propertyId: { in: properties.map((p) => p.id) } };
  } else if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({ where: { staffId: user.id }, select: { propertyId: true } });
    if (assignments.length === 0) {
      return { data: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 } };
    }
    propertyFilter = { propertyId: { in: assignments.map((a) => a.propertyId) } };
  } else if (user.role === 'user') {
    const tenancies = await prisma.tenancy.findMany({ where: { userId: user.id }, select: { id: true } });
    propertyFilter = { tenancyId: { in: tenancies.map((t) => t.id) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: Prisma.BillWhereInput = { ...propertyFilter };
  if (filters.status) query.status = filters.status as Prisma.BillWhereInput['status'];
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.tenancyId) query.tenancyId = filters.tenancyId;
  if (filters.type) query.type = filters.type as Prisma.BillWhereInput['type'];

  const { skip, limit, buildMeta } = paginate({ page: filters.page, limit: filters.limit });

  const [rows, total] = await Promise.all([
    prisma.bill.findMany({
      where: query,
      include: {
        tenancy: {
          include: {
            user: { select: TENANCY_USER_LIST_SELECT },
            comments: { orderBy: { createdAt: 'asc' } },
          },
        },
        property: { select: PROPERTY_REF_SELECT },
        unit: { select: UNIT_BASIC_SELECT },
        contract: { select: CONTRACT_BILLS_LIST_SELECT },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.bill.count({ where: query }),
  ]);

  return { data: serializeList(rows.map(remapBillsListRow)), pagination: buildMeta(total) };
};

export const getBillsByTenancy = async (userId: string, tenancyId: string) => {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({ where: { id: tenancyId }, include: { property: true } });
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  // Access check: owner, landlord, staff, or admin
  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = tenancy.userId === user.id;
  const isLandlord = tenancy.property.landlordId === user.id;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(user.id, tenancy.property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const rows = await prisma.bill.findMany({
    where: { tenancyId },
    include: {
      property: { select: PROPERTY_REF_SELECT },
      unit: { select: UNIT_IDENTIFIER_ONLY_SELECT },
    },
    orderBy: { createdAt: 'desc' },
  });

  return serializeList(rows.map(remapBillsByTenancyRow));
};

export const getBillById = async (userId: string, billId: string) => {
  // Invalid-id collapse (task-14 pattern, verbatim): `bill-by-id-not-found`
  // requests a Mongo-ObjectId sentinel, not a valid Postgres UUID -- collapse
  // it into the exact same 404 this function already throws for a
  // syntactically-valid-but-missing bill.
  if (!isValidId(billId)) {
    throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  }

  const bill = await prisma.bill.findUnique({
    where: { id: billId },
    include: {
      tenancy: {
        include: {
          user: { select: TENANCY_USER_DETAIL_SELECT },
          comments: { orderBy: { createdAt: 'asc' } },
        },
      },
      property: { select: PROPERTY_BILLING_SELECT },
      unit: { select: UNIT_BASIC_SELECT },
      contract: { select: CONTRACT_BILL_DETAIL_SELECT },
    },
  });

  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });

  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = bill.tenancy.userId === user.id;
  const isLandlord = bill.property.landlordId === user.id;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(user.id, bill.propertyId));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Include payments (sorted by createdAt desc, matching original; `billId` stays raw here -- never populated in the original).
  const payments = await prisma.payment.findMany({
    where: { billId },
    include: { recordedBy: { select: PAYMENT_RECORDED_BY_SELECT } },
    orderBy: { createdAt: 'desc' },
  });

  return serializeDoc({
    ...remapBillByIdRow(bill),
    payments: payments.map(remapPaymentForBillDetail),
  });
};

// ─────────────────────────────────────────────────────────────
//  Payment read operations
// ─────────────────────────────────────────────────────────────

export const getPayments = async (userId: string, filters: {
  tenancyId?: string; method?: string;
} = {}) => {
  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  let baseFilter: Prisma.PaymentWhereInput = {};

  if (user.role === 'landlord') {
    const properties = await prisma.property.findMany({ where: { landlordId: user.id }, select: { id: true } });
    const bills = await prisma.bill.findMany({ where: { propertyId: { in: properties.map((p) => p.id) } }, select: { id: true } });
    baseFilter = { billId: { in: bills.map((b) => b.id) } };
  } else if (user.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({ where: { staffId: user.id }, select: { propertyId: true } });
    if (assignments.length === 0) return [];
    const bills = await prisma.bill.findMany({ where: { propertyId: { in: assignments.map((a) => a.propertyId) } }, select: { id: true } });
    baseFilter = { billId: { in: bills.map((b) => b.id) } };
  } else if (user.role === 'user') {
    const tenancies = await prisma.tenancy.findMany({ where: { userId: user.id }, select: { id: true } });
    baseFilter = { tenancyId: { in: tenancies.map((t) => t.id) } };
  } else if (user.role !== 'super_admin') {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const query: Prisma.PaymentWhereInput = { ...baseFilter };
  if (filters.tenancyId) query.tenancyId = filters.tenancyId;
  if (filters.method) query.method = filters.method as Prisma.PaymentWhereInput['method'];

  const rows = await prisma.payment.findMany({
    where: query,
    include: { bill: { select: PAYMENT_BILL_LIST_SELECT }, recordedBy: { select: PAYMENT_RECORDED_BY_SELECT } },
    orderBy: { paymentDate: 'desc' },
  });

  return serializeList(rows.map(remapPaymentRow));
};

export const getPaymentsByTenancy = async (userId: string, tenancyId: string) => {
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  const tenancy = await prisma.tenancy.findUnique({ where: { id: tenancyId }, include: { property: true } });
  if (!tenancy) throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });

  const user = await resolveCallerProfile(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const isOwner = tenancy.userId === user.id;
  const isLandlord = tenancy.property.landlordId === user.id;
  const isStaff = user.role === 'staff' && (await isStaffAssignedToProperty(user.id, tenancy.property.id));
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const rows = await prisma.payment.findMany({
    where: { tenancyId },
    include: { bill: { select: PAYMENT_BILL_TENANCY_SELECT }, recordedBy: { select: PAYMENT_RECORDED_BY_SELECT } },
    orderBy: { paymentDate: 'desc' },
  });

  return serializeList(rows.map(remapPaymentRow));
};
