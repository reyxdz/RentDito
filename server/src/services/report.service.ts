import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { serializeDoc } from '../utils/serialize';

// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies anywhere in
// this file. Every export here builds a plain JS aggregation object from
// scratch (occupancy counts, forecast buckets, pipeline counts) -- the only
// relation embeds are `getCheckoutForecast`'s narrow `property{name}` /
// `unit{unitIdentifier}` / `user{name}` selects on `Contract` (a direct port
// of `.populate('propertyId','name')` / `.populate('unitId','unitIdentifier')`
// / `.populate('userId','name')`, each reshaped inline, not through a shared
// mapper) and the raw-SQL `properties` join inside the two `$lookup`+
// `$unwind` translations below, which select only `name`.
//
// Child-table includes (`tenancy_comments`, `unit_slots`, `ticket_updates`)
// audited per this task's brief: this file never embeds a full Tenancy,
// Unit, or Ticket row anywhere (every embed above is a narrow scalar
// select), so there is no silent-drop trap here.

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

/**
 * Property ids this user is permitted to see reports for. Direct port of
 * the original's role branching; the only structural change is the staff
 * branch, which now reads the `staff_property_assignments` join table
 * instead of a `User.assignedPropertyIds[]` array field that no longer
 * exists on `Profile`.
 */
const getAccessiblePropertyIds = async (userId: string): Promise<string[]> => {
  const user = await prisma.profile.findUnique({ where: { id: userId } });
  if (!user) throwWithStatus('User not found', 404);

  let where: Prisma.PropertyWhereInput = {};
  if (user!.role === 'landlord') {
    where = { landlordId: userId };
  } else if (user!.role === 'staff') {
    const assignments = await prisma.staffPropertyAssignment.findMany({
      where: { staffId: userId },
      select: { propertyId: true },
    });
    where = { id: { in: assignments.map((a) => a.propertyId) } };
  } else if (user!.role !== 'super_admin') {
    throwWithStatus('Insufficient permissions', 403);
  }

  const properties = await prisma.property.findMany({ where, select: { id: true } });
  return properties.map((p) => p.id);
};

// ═══════════════════════════════════════════════════════════════════════
//  getOccupancyStats -- 2 aggregation pipelines (overall + per-property
//  breakdown, the latter a `$lookup`+`$unwind` into `properties`).
//
//  Both pipelines' `$sum: {$cond: [...]}` counters map directly to
//  `COUNT(*) FILTER (WHERE ...)` -- unlike a conditional `SUM`, `COUNT`
//  never returns SQL NULL for a zero-match filter (it counts, it does not
//  sum a nullable column), so no CASE-form workaround is needed here the
//  way inventory.service.ts's conditional SUMs needed one.
//
//  NULL/EMPTY-SET TRAP THAT *DOES* APPLY: Mongo's `$group` stage only ever
//  emits a document when >=1 row survived the preceding `$match` -- so the
//  original's `stats` array is `[]`, not `[{...zeros}]`, whenever zero
//  units match, and `stats[0]` falls back to a hardcoded zeros object with
//  NO `_id` key. An ungrouped SQL aggregate has no such behavior: it ALWAYS
//  returns exactly one row (every COUNT at 0) even over zero matching table
//  rows. Reproducing the fixture's literal `_id: null` key -- present only
//  when real unit rows matched, per `occupancy-landlord1`'s golden fixture,
//  and absent both when `propertyIds` itself is empty (the early return
//  below) and, were it ever exercised, when `propertyIds` is non-empty but
//  no unit matches -- requires an explicit branch on `totalUnits > 0`, not
//  just trusting that the raw SQL row exists (see `overall` below).
// ═══════════════════════════════════════════════════════════════════════

interface OverallCountsRow {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  reservedUnits: number;
  maintenanceUnits: number;
}

interface OccupancyBreakdownRow extends OverallCountsRow {
  propertyId: string;
  propertyName: string;
}

export const getOccupancyStats = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return {
      totalUnits: 0,
      occupiedUnits: 0,
      vacantUnits: 0,
      reservedUnits: 0,
      maintenanceUnits: 0,
      occupancyRate: 0,
      propertyBreakdown: [],
    };
  }

  const overallRows = await prisma.$queryRaw<OverallCountsRow[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS "totalUnits",
      COUNT(*) FILTER (WHERE status = 'occupied')::int AS "occupiedUnits",
      COUNT(*) FILTER (WHERE status = 'vacant')::int AS "vacantUnits",
      COUNT(*) FILTER (WHERE status = 'reserved')::int AS "reservedUnits",
      COUNT(*) FILTER (WHERE status = 'maintenance')::int AS "maintenanceUnits"
    FROM units
    WHERE property_id = ANY(${propertyIds}::uuid[])
  `);
  const counts = overallRows[0];

  const overall: Record<string, unknown> = counts.totalUnits > 0
    ? {
        _id: null,
        totalUnits: counts.totalUnits,
        occupiedUnits: counts.occupiedUnits,
        vacantUnits: counts.vacantUnits,
        reservedUnits: counts.reservedUnits,
        maintenanceUnits: counts.maintenanceUnits,
      }
    : {
        totalUnits: 0,
        occupiedUnits: 0,
        vacantUnits: 0,
        reservedUnits: 0,
        maintenanceUnits: 0,
      };

  const totalUnits = overall.totalUnits as number;
  const occupiedUnits = overall.occupiedUnits as number;
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

  const breakdownRows = await prisma.$queryRaw<OccupancyBreakdownRow[]>(Prisma.sql`
    SELECT
      u.property_id AS "propertyId",
      p.name AS "propertyName",
      COUNT(*)::int AS "totalUnits",
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS "occupiedUnits",
      COUNT(*) FILTER (WHERE u.status = 'vacant')::int AS "vacantUnits",
      COUNT(*) FILTER (WHERE u.status = 'reserved')::int AS "reservedUnits",
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS "maintenanceUnits"
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE u.property_id = ANY(${propertyIds}::uuid[])
    GROUP BY u.property_id, p.name
    ORDER BY p.name ASC
  `);

  const propertyBreakdown = breakdownRows.map((row) => ({
    _id: row.propertyId,
    totalUnits: row.totalUnits,
    occupiedUnits: row.occupiedUnits,
    vacantUnits: row.vacantUnits,
    reservedUnits: row.reservedUnits,
    maintenanceUnits: row.maintenanceUnits,
    propertyId: row.propertyId,
    propertyName: row.propertyName,
    occupancyRate: row.totalUnits > 0 ? (row.occupiedUnits / row.totalUnits) * 100 : 0,
  }));

  return {
    ...overall,
    occupancyRate,
    propertyBreakdown,
  };
};

// ═══════════════════════════════════════════════════════════════════════
//  getCheckoutForecast -- the `$year`/`$month` grouping over `checkOutDate`.
//
//  TIMEZONE: Mongo's bare `{$year: '$field'}` / `{$month: '$field'}` (no
//  `timezone` option was ever passed in the original pipeline) operate in
//  UTC. `check_out_date` is `timestamptz`; grouping via a bare
//  `date_trunc`/`EXTRACT` would silently use the Postgres session's
//  `TimeZone` GUC instead, which can shift a checkout near a month boundary
//  into the wrong bucket -- the exact class of bug task-22 already hit once
//  (an 8-hour Asia/Manila offset between the two seeds). Forced explicitly
//  to UTC via `AT TIME ZONE 'UTC'` before extracting, rather than trusting
//  the session default.
// ═══════════════════════════════════════════════════════════════════════

interface CheckoutTrendRow {
  year: number;
  month: number;
  count: number;
}

export const getCheckoutForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return {
      monthlyForecast: [],
      peakMonth: null,
      expiringContracts: [],
      historicalTrend: [],
      totalRevenueLoss: 0,
    };
  }

  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(now.getMonth() + 6);

  // ── Future expiring contracts ──────────────────────────────
  const expiringContracts = await prisma.contract.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: { in: ['active', 'signed'] },
      endDate: { gte: now, lte: sixMonthsFromNow },
    },
    include: {
      property: { select: { name: true } },
      unit: { select: { unitIdentifier: true } },
      user: { select: { name: true } },
    },
    orderBy: { endDate: 'asc' },
  });

  // Aggregate by month
  const monthlyForecastMap: Record<string, { month: string; year: number; expiringCount: number; revenueLoss: number }> = {};
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'short' });
    monthlyForecastMap[monthKey] = { month: monthName, year: d.getFullYear(), expiringCount: 0, revenueLoss: 0 };
  }

  let peakMonth: string | null = null;
  let maxExpiring = -1;
  let totalRevenueLoss = 0;

  expiringContracts.forEach((contract) => {
    const d = contract.endDate;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    // `monthlyRent` is a Prisma.Decimal column -- `.toNumber()` BEFORE the
    // `+=` accumulation below, same reasoning as utility.service.ts's
    // `utilityAmount` (a raw Decimal is truthy and coerces via
    // `.toString()`, silently turning `+=` into string concatenation).
    const monthlyRent = contract.monthlyRent.toNumber();
    if (monthlyForecastMap[monthKey]) {
      monthlyForecastMap[monthKey].expiringCount += 1;
      monthlyForecastMap[monthKey].revenueLoss += monthlyRent;
      totalRevenueLoss += monthlyRent;
    }
  });

  const monthlyForecast = Object.values(monthlyForecastMap).map((data) => {
    if (data.expiringCount > maxExpiring) {
      maxExpiring = data.expiringCount;
      peakMonth = `${data.month} ${data.year}`;
    }
    return data;
  });

  // ── Historical checkout trend (past 12 months) ─────────────
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(now.getMonth() - 12);

  const historicalCheckouts = await prisma.$queryRaw<CheckoutTrendRow[]>(Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM (check_out_date AT TIME ZONE 'UTC'))::int AS "year",
      EXTRACT(MONTH FROM (check_out_date AT TIME ZONE 'UTC'))::int AS "month",
      COUNT(*)::int AS "count"
    FROM tenancies
    WHERE property_id = ANY(${propertyIds}::uuid[])
      AND status = 'checked_out'
      AND check_out_date >= ${twelveMonthsAgo}
      AND check_out_date <= ${now}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `);

  // Build 12-month historical array
  const historicalTrend: { month: string; year: number; checkouts: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    const match = historicalCheckouts.find((h) => h.year === d.getFullYear() && h.month === d.getMonth() + 1);
    historicalTrend.push({ month: monthName, year: d.getFullYear(), checkouts: match ? match.count : 0 });
  }

  return serializeDoc({
    monthlyForecast,
    peakMonth: maxExpiring > 0 ? peakMonth : null,
    totalRevenueLoss,
    historicalTrend,
    expiringContracts: expiringContracts.map((c) => ({
      contractId: c.id,
      propertyName: c.property?.name,
      unitIdentifier: c.unit?.unitIdentifier,
      tenantName: c.user?.name,
      endDate: c.endDate,
      monthlyRent: c.monthlyRent,
    })),
  });
};

// ═══════════════════════════════════════════════════════════════════════
//  getVacancyForecast -- 1 aggregation (Unit group by propertyId, another
//  `$lookup`+`$unwind` into `properties`); structurally identical to
//  `getOccupancyStats`'s breakdown pipeline, just 2 status counters instead
//  of 4 and no literal `_id` key expected in this fixture's response shape
//  (the original's `$project`/reshape step here never re-includes `_id`).
// ═══════════════════════════════════════════════════════════════════════

interface VacancyBreakdownRow {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  currentVacant: number;
  occupied: number;
}

export const getVacancyForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return { currentVacant: 0, predictedVacant: 0, totalUnits: 0, propertyBreakdown: [] };
  }

  const now = new Date();
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(now.getMonth() + 3);

  // Current vacancy per property
  const propertyBreakdownRows = await prisma.$queryRaw<VacancyBreakdownRow[]>(Prisma.sql`
    SELECT
      u.property_id AS "propertyId",
      p.name AS "propertyName",
      COUNT(*)::int AS "totalUnits",
      COUNT(*) FILTER (WHERE u.status = 'vacant')::int AS "currentVacant",
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS "occupied"
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE u.property_id = ANY(${propertyIds}::uuid[])
    GROUP BY u.property_id, p.name
    ORDER BY p.name ASC
  `);

  // Contracts expiring in next 3 months (predicted additional vacancies)
  const expiringContracts = await prisma.contract.findMany({
    where: {
      propertyId: { in: propertyIds },
      status: { in: ['active', 'signed'] },
      endDate: { gte: now, lte: threeMonthsFromNow },
    },
    select: { propertyId: true },
  });

  // Count predicted checkouts per property
  const predictedByProperty: Record<string, number> = {};
  expiringContracts.forEach((c) => {
    predictedByProperty[c.propertyId] = (predictedByProperty[c.propertyId] || 0) + 1;
  });

  let totalUnits = 0;
  let currentVacant = 0;
  let predictedVacant = 0;

  const breakdown = propertyBreakdownRows.map((row) => {
    const predicted = predictedByProperty[row.propertyId] || 0;
    totalUnits += row.totalUnits;
    currentVacant += row.currentVacant;
    predictedVacant += row.currentVacant + predicted;

    return {
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      totalUnits: row.totalUnits,
      currentVacant: row.currentVacant,
      predictedVacant: row.currentVacant + predicted,
      currentVacancyRate: row.totalUnits > 0 ? (row.currentVacant / row.totalUnits) * 100 : 0,
      predictedVacancyRate: row.totalUnits > 0 ? ((row.currentVacant + predicted) / row.totalUnits) * 100 : 0,
    };
  });

  return {
    totalUnits,
    currentVacant,
    predictedVacant,
    currentVacancyRate: totalUnits > 0 ? (currentVacant / totalUnits) * 100 : 0,
    predictedVacancyRate: totalUnits > 0 ? (predictedVacant / totalUnits) * 100 : 0,
    propertyBreakdown: breakdown,
  };
};

// ═══════════════════════════════════════════════════════════════════════
//  getReservationForecast -- no aggregation, just scoped counts.
// ═══════════════════════════════════════════════════════════════════════

export const getReservationForecast = async (userId: string) => {
  const propertyIds = await getAccessiblePropertyIds(userId);
  if (propertyIds.length === 0) {
    return { pendingInquiries: 0, scheduledVisits: 0, pendingApplications: 0, conversionRate: 0 };
  }

  // The original filtered Inquiry by `status: {$in: ['new', 'open']}`.
  // `InquiryStatus` has never had a `'new'` member in EITHER schema
  // (Mongoose's own `Inquiry.ts`: `'open' | 'in_progress' | 'closed' |
  // 'converted'`; Prisma's `InquiryStatus` enum: identical 4 values) -- it
  // was always a dead branch that could never match a real document, so
  // this filter was functionally `status: 'open'` in production from day
  // one. Ported as the single real value the original filter could ever
  // match.
  const [pendingInquiries, scheduledVisits, totalApplications, approvedApplications] = await Promise.all([
    prisma.inquiry.count({ where: { propertyId: { in: propertyIds }, status: 'open' } }),
    prisma.visitRequest.count({
      where: { propertyId: { in: propertyIds }, status: { in: ['approved', 'scheduled'] } },
    }),
    prisma.rentalApplication.count({ where: { propertyId: { in: propertyIds } } }),
    prisma.rentalApplication.count({ where: { propertyId: { in: propertyIds }, status: 'approved' } }),
  ]);

  // The original also queried RentalApplication with
  // `status: 'pending_review'` -- NOT a member of `ApplicationStatus` in
  // EITHER schema (Mongoose's own `RentalApplication.ts`: `'pending' |
  // 'under_review' | 'approved' | 'rejected'`; Prisma's `ApplicationStatus`
  // enum: identical 4 values, confirmed against the schema). This was
  // always a dead filter -- no application document can ever have this
  // status, so `pendingApplications` was unconditionally 0 in production
  // (matching this port's own golden fixture: `reservation-forecast-
  // landlord1` expects exactly 0). A literal `{status: 'pending_review'}`
  // filter is a TypeScript enum-type error here, and even forced through
  // `as any` would raise Postgres's "invalid input value for enum" at the
  // database boundary -- a NEW 500 failure mode Mongo's own looser
  // string-typed matching never had (it just silently matched nothing).
  // Hardcoding 0 preserves the exact, unconditional output the original
  // always produced, without introducing a regression the original never
  // had.
  const pendingApplications = 0;

  const conversionRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

  return {
    pendingInquiries,
    scheduledVisits,
    pendingApplications,
    totalApplications,
    approvedApplications,
    conversionRate,
  };
};
