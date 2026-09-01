import prisma from '../config/prisma';

// This is the one Mongoose-era controller that queried a model directly
// (`notification.controller.ts` imported `../models/Notification` and
// called `.find()`/`.countDocuments()`/`.findOneAndUpdate()`/`.updateMany()`
// inline) instead of going through a service -- the sole exception to the
// "all database access lives in the service layer" convention every other
// domain in this codebase follows. This file is the extraction that closes
// that gap, ported straight to Prisma rather than moved in place, so the
// codebase doesn't gain a freshly-Prisma-ported architectural exception.
//
// NOTE on propertyRef.mapper.ts / embeddedProfile.mapper.ts (listed as
// "existing utilities to use" for this port): neither applies. Nothing here
// embeds a Property or a full Profile row -- every export returns either a
// bespoke, already-camelCased Notification DTO (see `shapeNotification`
// below, which intentionally does NOT go through `serializeDoc`/
// `serializeList` -- see that function's own comment) or a plain count/void.
// No child-table (`tenancy_comments`/`unit_slots`/`ticket_updates`/
// `conversation_participants`/`message_reads`) is reachable from this file.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  metadata: unknown;
  createdAt: Date;
};

/**
 * The original controller built a bespoke, single-`id` (never `_id`) DTO
 * from the raw Mongoose doc -- NOT a passthrough of the document itself --
 * so this is intentionally NOT run through `serializeDoc`/`serializeList`
 * (which would add the dual `id`/`_id` mirror every other ported service
 * uses). Registered as the one deliberate exception in
 * `replay.meta.ts`'s `ALLOW_ID_ONLY` (`notifications-landlord1-has-two`),
 * per `replay.test.ts`'s own `assertDualId` comment calling out exactly
 * this shape by name.
 *
 * `link`/`metadata` are omitted entirely when unset, matching the
 * original: a Mongoose `lean()` doc simply has no key for an unset optional
 * path (`n.link` reads as `undefined`, and `JSON.stringify` drops an
 * `undefined`-valued key). Prisma returns an explicit `null` for the same
 * unset column instead, which `JSON.stringify` does NOT drop -- so this
 * builds the object with those two keys added only when non-null, to
 * reproduce the original's "key entirely absent" behavior byte-for-byte.
 */
function shapeNotification(row: NotificationRow): Record<string, unknown> {
  const shaped: Record<string, unknown> = {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    read: row.isRead,
    createdAt: row.createdAt,
  };
  if (row.link !== null && row.link !== undefined) shaped.link = row.link;
  if (row.metadata !== null && row.metadata !== undefined) shaped.metadata = row.metadata;
  return shaped;
}

export const getNotifications = async (userId: string, limit: number) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return notifications.map(shapeNotification);
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

export const markAsRead = async (userId: string, id: string) => {
  // A malformed/Mongo-shaped id can never match a real row -- collapse it
  // into the same "not found" outcome the function already returns for a
  // syntactically-valid-but-missing/not-owned id (task-14 pattern), rather
  // than letting Prisma's `@db.Uuid` validation throw P2023 on the lookup.
  if (!isValidId(id)) {
    return null;
  }

  // Mongoose's `findOneAndUpdate({_id, userId}, ...)` atomically scopes the
  // update to the caller's own notification in one round trip. Prisma's
  // `update()` requires a unique `where` (id alone), so this does the
  // ownership check as a `findFirst` first, then updates by id -- same
  // "only the owner's own notification, or nothing" semantics, two round
  // trips instead of one. No fixture requires atomicity here (a single-row,
  // single-field write with no second write alongside it), so no
  // transaction is needed.
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return shapeNotification(updated);
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};
