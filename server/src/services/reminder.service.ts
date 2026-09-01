import prisma from '../config/prisma';

// ─────────────────────────────────────────────────────────────
//  Pre-Checkout Reminder Service
//
//  Creates notifications at 7, 3, and 1 day(s) before contract end
//  for the landlord, assigned staff, and tenant.
//
//  This is a standalone function — cron wiring happens in
//  scheduler.service.ts (Phase 5).
//
//  Neither export here is reachable from any HTTP route, and this file has
//  no golden-fixture coverage -- confirmed by a repo-wide grep: nothing
//  outside this file imports `scheduleCheckoutReminders`/
//  `processAllCheckoutReminders`, and `scheduler.service.ts`'s own
//  `initScheduler()` never wires either of them into a cron job (its own
//  Job 4, `sendCheckoutReminders`, is a separate, simpler implementation
//  that predates this file and was never consolidated with it -- both are
//  ported here exactly as found, not merged, since merging them is a
//  behavior change outside this task's scope). Ported carefully and
//  verified by direct invocation instead (see the task report).
// ─────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

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
  // No HTTP route reaches this function, so no fixture forces this guard --
  // added pre-emptively (task-14 pattern) at zero cost, closing the same
  // malformed-id-to-P2023-to-500 trap every other id-taking function in
  // this migration guards against.
  if (!isValidId(tenancyId)) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  // 1. Load tenancy with related data
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, name: true, landlordId: true } },
      contract: { select: { endDate: true, status: true } },
    },
  });

  if (!tenancy) {
    throw Object.assign(new Error('Tenancy not found'), { statusCode: 404 });
  }

  if (tenancy.status !== 'checked_in') {
    return { sent: 0, reason: `Tenancy is '${tenancy.status}', not 'checked_in'. Skipping.` };
  }

  const contract = tenancy.contract;
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

  const property = tenancy.property;
  const tenant = tenancy.user;

  if (!property || !tenant) {
    return { sent: 0, reason: 'Missing property or tenant data. Skipping.' };
  }

  const dayLabel = daysRemaining === 1 ? '1 day' : `${daysRemaining} days`;
  let sent = 0;

  // 4. Notify the TENANT
  //
  // Sequential, non-atomic notification creates for tenant/landlord/staff
  // below -- matches the original exactly. These are pure notification
  // fan-outs (no other row is written alongside any of them), the same
  // class of write scheduler.service.ts's own reminder jobs document as
  // deliberately not wrapped in a transaction.
  await prisma.notification.create({
    data: {
      userId: tenant.id,
      type: 'contract',
      title: `Contract Ending in ${dayLabel}`,
      message: `Your tenancy at ${property.name} ends in ${dayLabel}. Please coordinate with your landlord regarding renewal or checkout preparations.`,
      link: '/u/contracts',
      metadata: {
        tenancyId: tenancy.id,
        propertyId: property.id,
        daysRemaining,
      },
    },
  });
  sent++;

  // 5. Notify the LANDLORD
  if (property.landlordId) {
    await prisma.notification.create({
      data: {
        userId: property.landlordId,
        type: 'contract',
        title: `Tenant Contract Ending in ${dayLabel}`,
        message: `${tenant.name}'s contract at ${property.name} expires in ${dayLabel}. Please review outstanding balances, inventory, and checkout procedures.`,
        link: `/hub/tenants/${tenancy.id}`,
        metadata: {
          tenancyId: tenancy.id,
          propertyId: property.id,
          tenantName: tenant.name,
          daysRemaining,
        },
      },
    });
    sent++;
  }

  // 6. Notify assigned STAFF for this property. `User.find({role:'staff',
  // assignedPropertyIds: property._id})` reads the join table now --
  // `staff_property_assignments` carries no `name`, and the original never
  // used the staff member's name in the notification copy anyway, so a
  // narrow `staffId`-only query replaces the original's `.select('_id name')`.
  const assignedStaff = await prisma.staffPropertyAssignment.findMany({
    where: { propertyId: property.id },
    select: { staffId: true },
  });

  for (const staff of assignedStaff) {
    await prisma.notification.create({
      data: {
        userId: staff.staffId,
        type: 'contract',
        title: `Tenant Checkout Approaching — ${dayLabel}`,
        message: `${tenant.name}'s contract at ${property.name} expires in ${dayLabel}. Please ensure inventory and unit inspection preparations are in order.`,
        link: `/hub/tenants/${tenancy.id}`,
        metadata: {
          tenancyId: tenancy.id,
          propertyId: property.id,
          tenantName: tenant.name,
          daysRemaining,
        },
      },
    });
    sent++;
  }

  return {
    sent,
    tenancyId: tenancy.id,
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
  const activeTenancies = await prisma.tenancy.findMany({
    where: { status: 'checked_in' },
    select: { id: true },
  });

  let totalSent = 0;
  let processed = 0;
  let errors = 0;

  for (const tenancy of activeTenancies) {
    try {
      const result = await scheduleCheckoutReminders(tenancy.id);
      totalSent += result.sent;
      processed++;
    } catch (err: any) {
      console.error(`[ReminderService] Error processing tenancy ${tenancy.id}:`, err.message);
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
