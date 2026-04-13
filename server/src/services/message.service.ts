import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { Inquiry } from '../models/Inquiry';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import mongoose from 'mongoose';

/**
 * Get messages for a conversation (paginated)
 */
export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  page: number = 1,
  limit: number = 50
) => {
  // Check if user is participant
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  const isParticipant = conversation.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  const skip = (page - 1) * limit;
  const messages = await Message.find({ conversationId })
    .populate('senderId', 'name avatar')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Message.countDocuments({ conversationId });

  // Mark messages as read by current user
  await Message.updateMany(
    {
      conversationId,
      senderId: { $ne: userId },
      readBy: { $ne: userId }
    },
    {
      $addToSet: { readBy: userId }
    }
  );

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
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
  // Check if user is participant
  const conversation = await Conversation.findById(conversationId)
    .populate('inquiryId')
    .lean();

  if (!conversation) {
    throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
  }

  const isParticipant = conversation.participants.some(
    p => p.toString() === userId
  );

  if (!isParticipant) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Create message
  const message = await Message.create({
    conversationId,
    senderId: userId,
    content: data.content,
    attachments: data.attachments || [],
    readBy: [userId]
  });

  // Get sender info
  const sender = await User.findById(userId).select('name').lean();

  // Notify other participants
  const otherParticipants = conversation.participants.filter(
    p => p.toString() !== userId
  );

  const inquiry = conversation.inquiryId as any;

  for (const participantId of otherParticipants) {
    await Notification.create({
      userId: participantId,
      type: 'message',
      title: 'New Message',
      message: `${sender?.name} sent you a message`,
      link: `/hub/pipeline/inquiries/${inquiry._id}`,
      metadata: {
        conversationId: conversation._id.toString(),
        inquiryId: inquiry._id.toString()
      }
    });
  }

  // Update inquiry status to in_progress if it was open
  if (inquiry.status === 'open') {
    await Inquiry.findByIdAndUpdate(inquiry._id, { status: 'in_progress' });
  }

  return message.populate('senderId', 'name avatar');
};
