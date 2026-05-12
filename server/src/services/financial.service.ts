import { Payment } from '../models/Payment';
import { Property } from '../models/Property';
import { User } from '../models/User';

type DateRangeInput = {
  from?: string;
  to?: string;
};

type FinancialFilters = DateRangeInput & {
  propertyId?: string;
};

type MonthlyFilters = {
  year?: number;
  propertyId?: string;
};

type SplitResult = {
  rent: number;
  utility: number;
  penalty: number;
  refund: number;
};

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const ensureUser = async (userId: string): Promise<any> => {
  const user: any = await User.findById(userId);
  if (!user) {
    throwWithStatus('User not found', 404);
  }
  return user;
};

const hasFinancialPermission = (user: any): boolean => {
  return user.role !== 'staff' || Boolean(user.permissions?.includes('financials'));
};

const resolveScopedPropertyIds = async (user: any): Promise<string[] | null> => {
  if (user.role === 'super_admin') {
    return null;
  }

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: user._id }).select('_id');
    return properties.map((property: any) => property._id.toString());
  }

  if (user.role === 'staff') {
    if (!hasFinancialPermission(user)) {
      throwWithStatus('Access denied. Missing permission: financials', 403);
    }
    return (user.assignedPropertyIds || []).map((id: any) => id.toString());
  }

  throwWithStatus('Access denied', 403);
  return [];
};

const ensurePropertyAccess = async (user: any, propertyId: string) => {
  const property: any = await Property.findById(propertyId);
  if (!property) {
    throwWithStatus('Property not found', 404);
  }

  if (user.role === 'super_admin') {
    return;
  }
  if (user.role === 'landlord' && property.landlordId.toString() === user._id.toString()) {
    return;
  }
  if (user.role === 'staff') {
    if (!hasFinancialPermission(user)) {
      throwWithStatus('Access denied. Missing permission: financials', 403);
    }
    if (user.assignedPropertyIds?.some((id: any) => id.toString() === propertyId)) {
      return;
    }
  }

  throwWithStatus('Access denied', 403);
};

const parseDateRange = (filters: DateRangeInput) => {
  if (filters.from && Number.isNaN(Date.parse(filters.from))) {
    throwWithStatus('Invalid from date', 400);
  }
  if (filters.to && Number.isNaN(Date.parse(filters.to))) {
    throwWithStatus('Invalid to date', 400);
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  const from = filters.from ? new Date(filters.from) : startOfYear;
  const to = filters.to ? new Date(filters.to) : now;

  if (from > to) {
    throwWithStatus('from date cannot be after to date', 400);
  }

  return { from, to };
};

const splitPaymentByBillComposition = (amount: number, bill: any): SplitResult => {
  const rent = Number(bill?.rentAmount || 0);
  const utility = Number(bill?.utilityAmount || 0);
  const penalty = Number(bill?.penaltyAmount || 0);
  const total = Number(bill?.totalAmount || 0);

  if (amount < 0) {
    // Negative payments are treated as refunds if ever supported in the future.
    return { rent: 0, utility: 0, penalty: 0, refund: Math.abs(amount) };
  }

  if (total > 0) {
    const ratio = amount / total;
    const rentPart = round2(rent * ratio);
    const utilityPart = round2(utility * ratio);
    const penaltyPart = round2(penalty * ratio);
    const allocated = round2(rentPart + utilityPart + penaltyPart);
    const diff = round2(amount - allocated);

    // Keep accounting balanced after rounding by assigning tiny remainder to rent.
    return {
      rent: round2(rentPart + diff),
      utility: utilityPart,
      penalty: penaltyPart,
      refund: 0
    };
  }

  if (bill?.type === 'rent') return { rent: amount, utility: 0, penalty: 0, refund: 0 };
  if (bill?.type === 'utility') return { rent: 0, utility: amount, penalty: 0, refund: 0 };
  if (bill?.type === 'penalty') return { rent: 0, utility: 0, penalty: amount, refund: 0 };
  if (bill?.type === 'combined') return { rent: amount, utility: 0, penalty: 0, refund: 0 };

  return { rent: 0, utility: 0, penalty: 0, refund: 0 };
};

const getPaymentsForScope = async (
  user: any,
  range: { from: Date; to: Date },
  propertyId?: string
) => {
  const scopedPropertyIds = await resolveScopedPropertyIds(user);
  if (propertyId) {
    await ensurePropertyAccess(user, propertyId);
  }

  const payments: any[] = await Payment.find({
    paymentDate: { $gte: range.from, $lte: range.to }
  })
    .populate('billId', 'propertyId type rentAmount utilityAmount penaltyAmount totalAmount')
    .lean();

  const scoped = payments.filter((payment: any) => {
    const bill = payment.billId;
    const billPropertyId = bill?.propertyId?.toString?.() || bill?.propertyId?._id?.toString?.();
    if (!bill || !billPropertyId) return false;

    if (propertyId && billPropertyId !== propertyId) return false;
    if (scopedPropertyIds && !scopedPropertyIds.includes(billPropertyId)) return false;
    return true;
  });

  return scoped;
};

export const getFinancialSummary = async (userId: string, filters: FinancialFilters = {}) => {
  const user = await ensureUser(userId);
  const range = parseDateRange(filters);
  const payments = await getPaymentsForScope(user, range, filters.propertyId);

  const totals = payments.reduce(
    (acc: any, payment: any) => {
      const split = splitPaymentByBillComposition(Number(payment.amount || 0), payment.billId);
      acc.rentCollected += split.rent;
      acc.utilitiesCollected += split.utility;
      acc.penaltiesCollected += split.penalty;
      acc.refunds += split.refund;
      return acc;
    },
    {
      rentCollected: 0,
      utilitiesCollected: 0,
      penaltiesCollected: 0,
      refunds: 0
    }
  );

  totals.rentCollected = round2(totals.rentCollected);
  totals.utilitiesCollected = round2(totals.utilitiesCollected);
  totals.penaltiesCollected = round2(totals.penaltiesCollected);
  totals.refunds = round2(totals.refunds);

  const netIncome = round2(
    totals.rentCollected + totals.utilitiesCollected + totals.penaltiesCollected - totals.refunds
  );

  return {
    ...totals,
    netIncome,
    range
  };
};

export const getMonthlyFinancialTrend = async (userId: string, filters: MonthlyFilters = {}) => {
  const user = await ensureUser(userId);
  const now = new Date();
  const year = filters.year || now.getFullYear();

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throwWithStatus('Year must be between 2000 and 2100', 400);
  }

  const range = {
    from: new Date(year, 0, 1, 0, 0, 0, 0),
    to: new Date(year, 11, 31, 23, 59, 59, 999)
  };

  const payments = await getPaymentsForScope(user, range, filters.propertyId);

  const buckets = Array.from({ length: 12 }, (_, monthIndex) => ({
    month: monthIndex + 1,
    label: new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'short' }),
    rentCollected: 0,
    utilitiesCollected: 0,
    penaltiesCollected: 0,
    refunds: 0,
    netIncome: 0
  }));

  for (const payment of payments) {
    const paymentDate = new Date(payment.paymentDate);
    const monthIndex = paymentDate.getMonth();
    const split = splitPaymentByBillComposition(Number(payment.amount || 0), payment.billId);
    buckets[monthIndex].rentCollected += split.rent;
    buckets[monthIndex].utilitiesCollected += split.utility;
    buckets[monthIndex].penaltiesCollected += split.penalty;
    buckets[monthIndex].refunds += split.refund;
  }

  for (const bucket of buckets) {
    bucket.rentCollected = round2(bucket.rentCollected);
    bucket.utilitiesCollected = round2(bucket.utilitiesCollected);
    bucket.penaltiesCollected = round2(bucket.penaltiesCollected);
    bucket.refunds = round2(bucket.refunds);
    bucket.netIncome = round2(
      bucket.rentCollected + bucket.utilitiesCollected + bucket.penaltiesCollected - bucket.refunds
    );
  }

  return {
    year,
    trend: buckets
  };
};

export const getFinancialByProperty = async (userId: string, filters: FinancialFilters = {}) => {
  const user = await ensureUser(userId);
  const range = parseDateRange(filters);
  const payments = await getPaymentsForScope(user, range, filters.propertyId);

  const totalsByProperty = new Map<string, {
    propertyId: string;
    rentCollected: number;
    utilitiesCollected: number;
    penaltiesCollected: number;
    refunds: number;
    netIncome: number;
  }>();

  for (const payment of payments) {
    const bill = payment.billId;
    const propertyId = bill?.propertyId?.toString?.() || bill?.propertyId?._id?.toString?.();
    if (!propertyId) continue;

    if (!totalsByProperty.has(propertyId)) {
      totalsByProperty.set(propertyId, {
        propertyId,
        rentCollected: 0,
        utilitiesCollected: 0,
        penaltiesCollected: 0,
        refunds: 0,
        netIncome: 0
      });
    }

    const row = totalsByProperty.get(propertyId)!;
    const split = splitPaymentByBillComposition(Number(payment.amount || 0), bill);
    row.rentCollected += split.rent;
    row.utilitiesCollected += split.utility;
    row.penaltiesCollected += split.penalty;
    row.refunds += split.refund;
  }

  const propertyIds = Array.from(totalsByProperty.keys());
  const properties = await Property.find({ _id: { $in: propertyIds } }).select('name').lean();
  const propertyNameMap = new Map<string, string>(
    properties.map((property: any) => [property._id.toString(), property.name])
  );

  const data = Array.from(totalsByProperty.values()).map((row) => {
    const rentCollected = round2(row.rentCollected);
    const utilitiesCollected = round2(row.utilitiesCollected);
    const penaltiesCollected = round2(row.penaltiesCollected);
    const refunds = round2(row.refunds);
    const netIncome = round2(rentCollected + utilitiesCollected + penaltiesCollected - refunds);

    return {
      ...row,
      propertyName: propertyNameMap.get(row.propertyId) || 'Unknown Property',
      rentCollected,
      utilitiesCollected,
      penaltiesCollected,
      refunds,
      netIncome
    };
  });

  data.sort((a, b) => b.netIncome - a.netIncome);

  return {
    range,
    data
  };
};
