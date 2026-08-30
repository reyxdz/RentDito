import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';
import { serializeDoc, serializeList } from '../utils/serialize';
import { toHttpError } from '../utils/prismaErrors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidId = (id: string): boolean => UUID_RE.test(id);

/**
 * Drops any null-valued key from a shallow object, mirroring Mongoose's
 * "unset optional path -> key entirely absent" convention (same pattern
 * used by property.service.ts/unit.service.ts/inquiry.service.ts).
 */
function stripNulls<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (obj[key] === null) delete obj[key];
  }
  return obj;
}

/** `.populate('senderId', 'name avatar')` -- both read paths. */
const SENDER_SELECT = { id: true, name: true, avatar: true } satisfies Prisma.ProfileSelect;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; avatar: true } };
    readBy: { select: { userId: true } };
  };
}>;

/**
 * `readBy` was a flat `mongoose.Types.ObjectId[]` embedded on the Message
 * document; it is now the `message_reads` join table (Task 6's promotion).
 * The API response must still present it as a flat array of user ids, so
 * every read here re-flattens the joined rows back onto the `readBy` key --
 * never leaving the raw `{ messageId, userId }` join rows in the response.
 * `senderId` gets the same `remapLandlord`-style relation-remap treatment
 * (property.service.ts / task-10-report.md's pattern): the populated object
 * replaces the scalar FK under the exact same key.
 */
function remapMessage(row: MessageWithRelations): Record<string, unknown> {
  const { sender, readBy, ...rest } = row;
  const out: Record<string, unknown> = { ...rest };
  if (sender !== undefined) out.senderId = stripNulls({ ...sender });
  if (readBy !== undefined) out.readBy = readBy.map((r) => r.userId);
  return out;
}

/**
 * Get messages for a conversation (paginated)
 */
export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  page: number = 1,
  limit: number = 50
) => {
  // A Mongo-ObjectId-shaped sentinel (e.g. the golden fixture's
  // `000000000000000000000000`) is syntactically valid under Mongoose's
  // ObjectId rules but is NOT a valid Postgres UUID; handed straight to
  // Prisma it raises P2023 (malformed UUID), which toHttpError has no
  // mapping for and would fall through to a 500. Collapse it into the SAME
  // 404 this function already throws for a syntactically-valid-but-missing
  // conversation -- copied verbatim from the invalid-id pattern
  // (task-14-report.md / task-16-report.md), rather than a distinct 400.
  if (!isValidId(conversationId)) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  // Check if user is participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  });
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  const isParticipant = conversation.participants.some((p) => p.userId === userId);

  if (!isParticipant) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const skip = (page - 1) * limit;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: { sender: { select: SENDER_SELECT }, readBy: { select: { userId: true } } },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
  });

  const total = await prisma.message.count({ where: { conversationId } });

  // Mark messages as read by current user. Mongoose did this with
  // `Message.updateMany({ senderId: { $ne: userId }, readBy: { $ne: userId } },
  // { $addToSet: { readBy: userId } })` -- an update that is a no-op the
  // second time it runs against the same message (idempotent by
  // construction). The Postgres equivalent is an INSERT into the join
  // table, which is NOT idempotent on its own (a second identical insert
  // would throw a unique-constraint violation on the `(messageId, userId)`
  // composite key). Restore idempotency two ways, belt-and-braces:
  //   1. Only select messages the user hasn't already read (`readBy: { none:
  //      { userId } } }`), so a second call normally has nothing left to
  //      insert at all.
  //   2. `createMany({ skipDuplicates: true })` as a safety net for the
  //      remaining race (two concurrent requests both read the same "unread"
  //      set before either one's insert lands) -- a duplicate row is
  //      silently skipped rather than thrown.
  // This runs AFTER the messages are fetched above, matching the original's
  // ordering exactly: the response reflects readBy state from BEFORE this
  // call's own read-marking side effect (verified against the golden
  // fixture, where the caller's own read is not yet reflected in the
  // returned `readBy` arrays).
  const unread = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readBy: { none: { userId } },
    },
    select: { id: true },
  });

  if (unread.length > 0) {
    await prisma.messageRead.createMany({
      data: unread.map((m) => ({ messageId: m.id, userId })),
      skipDuplicates: true,
    });
  }

  return {
    messages: serializeList(messages.map(remapMessage)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Send message in a conversation
 */
export const sendMessage = async (
  userId: string,
  conversationId: string,
  data: {
    content: string;
    attachments?: string[];
  }
) => {
  // Same invalid-id collapse as getConversationMessages -- see its comment.
  if (!isValidId(conversationId)) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  // Check if user is participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true, inquiry: true },
  });

  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  const isParticipant = conversation.participants.some((p) => p.userId === userId);

  if (!isParticipant) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  try {
    // Create message. `readBy: [userId]` under Mongoose becomes one
    // `message_reads` row for the sender, created in the same nested write.
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: data.content,
        attachments: data.attachments || [],
        readBy: { create: { userId } },
      },
      include: { sender: { select: SENDER_SELECT }, readBy: { select: { userId: true } } },
    });

    // Get sender info
    const sender = await prisma.profile.findUnique({ where: { id: userId }, select: { name: true } });

    // Notify other participants
    const otherParticipants = conversation.participants.filter((p) => p.userId !== userId);

    const inquiry = conversation.inquiry;

    for (const participant of otherParticipants) {
      // Determine correct link based on participant role
      const participantProfile = await prisma.profile.findUnique({
        where: { id: participant.userId },
        select: { role: true },
      });
      const isHubUser =
        participantProfile &&
        (participantProfile.role === 'landlord' ||
          participantProfile.role === 'staff' ||
          participantProfile.role === 'super_admin');
      const link = isHubUser
        ? `/hub/pipeline/inquiries/${inquiry.id}`
        : `/u/inquiries/${inquiry.id}`;

      await prisma.notification.create({
        data: {
          userId: participant.userId,
          type: 'message',
          title: 'New Message',
          message: `${sender?.name} sent you a message`,
          link,
          metadata: {
            conversationId: conversation.id,
            inquiryId: inquiry.id,
          },
        },
      });
    }

    // Update inquiry status to in_progress if it was open
    if (inquiry.status === 'open') {
      await prisma.inquiry.update({ where: { id: inquiry.id }, data: { status: 'in_progress' } });
    }

    return serializeDoc(remapMessage(message));
  } catch (e) {
    throw toHttpError(e);
  }
};
