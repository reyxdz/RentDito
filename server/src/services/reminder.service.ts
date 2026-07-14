import { Tenancy } from '../models/Tenancy';
import { Contract } from '../models/Contract';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

// ─────────────────────────────────────────────────────────────
//  Pre-Checkout Reminder Service
//
//  Creates notifications at 7, 3, and 1 day(s) before contract end
//  for the landlord, assigned staff, and tenant.
//
//  This is a standalone function — cron wiring happens in Phase 5
//  via scheduler.service.ts.
// ─────────────────────────────────────────────────────────────

/**
 * Schedule pre-checkout reminders for a specific tenancy.
 *
 * Checks the tenancy's contract end date and if it falls exactly
 * 7, 3, or 1 day(s) from now, creates notifications for:
 *   - The tenant
 *   - The property landlord
 *   - Any staff assigned to the property
 *
 * @param tenancyId - The ID of the tenancy to check
 * @returns Object with count of notifications sent
 */
export const scheduleCheckoutReminders = async (tenancyId: string) => {
  // 1. Load tenancy with related data
  const tenancy: any = await Tenancy.findById(tenancyId)
    .populate('userId', 'name email')
    .populate('propertyId', 'name landlordId')
    .populate('contractId', 'endDate status');

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  if (tenancy.status !== 'checked_in') {
    return { sent: 0, reason: `Tenancy is '${tenancy.status}', not 'checked_in'. Skipping.` };
  }

  const contract = tenancy.contractId;
  if (!contract || !contract.endDate) {
    return { sent: 0, reason: 'No contract or end date found. Skipping.' };
  }

  if (contract.status !== 'active') {
    return { sent: 0, reason: `Contract status is '${contract.status}', not 'active'. Skipping.` };
  }

  // 2. Calculate days remaining
  const now = new Date();
  const endDate = new Date(contract.endDate);
  const diffMs = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // 3. Only send reminders at exactly 7, 3, or 1 day(s) before end
  const reminderDays = [7, 3, 1];
  if (!reminderDays.includes(daysRemaining)) {
    return { sent: 0, reason: `${daysRemaining} days remaining — not a reminder day (7/3/1). Skipping.` };
  }

  const property = tenancy.propertyId;
  const tenant = tenancy.userId;

  if (!property || !tenant) {
    return { sent: 0, reason: 'Missing property or tenant data. Skipping.' };
  }

  const dayLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
  let sent = 0;

  // 4. Notify the TENANT
  await Notification.create({
    userId: tenant._id,
    type: 'contract',
    title: `Contract Ending in ${dayLabel}`,
    message: `Your tenancy at ${property.name} ends in ${dayLabel}. Please coordinate with your landlord regarding renewal or checkout preparations.`,
    link: '/u/contracts',
    metadata: {
      tenancyId: tenancy._id.toString(),
      propertyId: property._id.toString(),
      daysRemaining,
    },
  });
  sent++;

  // 5. Notify the LANDLORD
  if (property.landlordId) {
    await Notification.create({
      userId: property.landlordId,
      type: 'contract',
      title: `Tenant Contract Ending in ${dayLabel}`,
      message: `${tenant.name}'s contract at ${property.name} expires in ${dayLabel}. Please review outstanding balances, inventory, and checkout procedures.`,
      link: `/hub/tenants/${tenancy._id}`,
      metadata: {
        tenancyId: tenancy._id.toString(),
        propertyId: property._id.toString(),
        tenantName: tenant.name,
        daysRemaining,
      },
    });
    sent++;
  }

  // 6. Notify assigned STAFF for this property
  const assignedStaff = await User.find({
    role: 'staff',
    assignedPropertyIds: property._id,
  }).select('_id name');

  for (const staff of assignedStaff) {
    await Notification.create({
      userId: staff._id,
      type: 'contract',
      title: `Tenant Checkout Approaching — ${dayLabel}`,
      message: `${tenant.name}'s contract at ${property.name} expires in ${dayLabel}. Please ensure inventory and unit inspection preparations are in order.`,
      link: `/hub/tenants/${tenancy._id}`,
      metadata: {
        tenancyId: tenancy._id.toString(),
        propertyId: property._id.toString(),
        tenantName: tenant.name,
        daysRemaining,
      },
    });
    sent++;
  }

  return {
    sent,
    tenancyId: tenancy._id.toString(),
    daysRemaining,
    message: `Sent ${sent} checkout reminder notification(s) for ${tenant.name} (${dayLabel} remaining).`,
  };
};

/**
 * Batch process: check ALL active tenancies and send reminders
 * for any whose contract ends in exactly 7, 3, or 1 day(s).
 *
 * Intended to be called by the cron scheduler once per day.
 */
export const processAllCheckoutReminders = async () => {
  const activeTenancies = await Tenancy.find({ status: 'checked_in' }).select('_id');

  let totalSent = 0;
  let processed = 0;
  let errors = 0;

  for (const tenancy of activeTenancies) {
    try {
      const result = await scheduleCheckoutReminders(tenancy._id.toString());
      totalSent += result.sent;
      processed++;
    } catch (err: any) {
      console.error(`[ReminderService] Error processing tenancy ${tenancy._id}:`, err.message);
      errors++;
    }
  }

  return {
    processed,
    totalSent,
    errors,
    message: `Processed ${processed} tenancies, sent ${totalSent} reminders, ${errors} errors.`,
  };
};
