import { Inquiry, IInquiry } from '../models/Inquiry';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Property } from '../models/Property';
import mongoose from 'mongoose';

/**
 * Create inquiry (user must be verified)
 * Auto-creates conversation and sends initial message
 * Creates notification for landlord
 */
export const createInquiry = async (
  userId: string,
  data: {
    propertyId: string;
    unitId?: string;
    subject: string;
    initialMessage: string;
  }
) => {
  // Check if user is verified
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to submit inquiries'),
      { statusCode: 403 }
    );
  }

  // Get property to find landlord
  const property = await Property.findById(data.propertyId);
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  // Create inquiry
  const inquiry = await Inquiry.create({
    userId,
    propertyId: data.propertyId,
    unitId: data.unitId,
    subject: data.subject,
    status: 'open'
  });

  // Auto-create conversation with participants
  const conversation = await Conversation.create({
    inquiryId: inquiry._id,
    participants: [userId, property.landlordId]
  });

  // Create initial message
  await Message.create({
    conversationId: conversation._id,
    senderId: userId,
    content: data.initialMessage,
    attachments: [],
    readBy: [userId]
  });

  // Create notification for landlord
  await Notification.create({
    userId: property.landlordId,
    type: 'inquiry',
    title: 'New Inquiry',
    message: `${user.name} sent an inquiry about ${property.name}`,
    link: `/hub/pipeline/inquiries/${inquiry._id}`,
    metadata: {
      inquiryId: inquiry._id.toString(),
      propertyId: property._id.toString()
    }
  });

  return inquiry.populate(['userId', 'propertyId', 'unitId']);
};

/**
 * Get user's own inquiries
 */
export const getMyInquiries = async (userId: string) => {
  const inquiries = await Inquiry.find({ userId })
    .populate('propertyId', 'name address images')
    .populate('unitId', 'unitIdentifier')
    .sort({ createdAt: -1 })
    .lean();

  return inquiries;
};

/**
 * Get inquiries for a property (landlord/staff only)
 */
export const getPropertyInquiries = async (
  userId: string,
  propertyId: string,
  filters: { status?: string } = {}
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Check access
  const property = await Property.findById(propertyId);
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  const hasAccess =
    user.role === 'super_admin' ||
    property.landlordId.toString() === userId ||
    (user.role === 'staff' &&
      user.assignedPropertyIds?.some(id => id.toString() === propertyId));

  if (!hasAccess) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Build filter
  const filter: any = { propertyId };
  if (filters.status) {
    filter.status = filters.status;
  }

  const inquiries = await Inquiry.find(filter)
    .populate('userId', 'name email phone avatar')
    .populate('unitId', 'unitIdentifier')
    .sort({ createdAt: -1 })
    .lean();

  return inquiries;
};

/**
 * Get inquiry detail with conversation
 */
export const getInquiryById = async (userId: string, inquiryId: string) => {
  const inquiry: any = await Inquiry.findById(inquiryId)
    .populate('userId', 'name email phone avatar')
    .populate('propertyId', 'name address landlordId')
    .populate('unitId', 'unitIdentifier')
    .lean();

  if (!inquiry) {
    throw Object.assign(new Error('Inquiry not found'), { statusCode: 404 });
  }

  // Check access
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const isOwner = inquiry.userId._id.toString() === userId;
  const isLandlord = inquiry.propertyId.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(
      id => id.toString() === inquiry.propertyId._id.toString()
    );
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  // Get conversation
  const conversation = await Conversation.findOne({ inquiryId }).lean();

  return {
    ...inquiry,
    conversationId: conversation?._id
  };
};

/**
 * Update inquiry status
 */
export const updateInquiryStatus = async (
  userId: string,
  inquiryId: string,
  status: string
) => {
  const inquiry = await Inquiry.findById(inquiryId).populate('propertyId');
  if (!inquiry) {
    throw Object.assign(new Error('Inquiry not found'), { statusCode: 404 });
  }

  // Check access (landlord/staff only)
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = inquiry.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(
      id => id.toString() === property._id.toString()
    );
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  inquiry.status = status as any;
  await inquiry.save();

  // Notify user if status changed to closed or converted
  if (status === 'closed' || status === 'converted') {
    await Notification.create({
      userId: inquiry.userId,
      type: 'inquiry',
      title: `Inquiry ${status === 'closed' ? 'Closed' : 'Converted'}`,
      message: `Your inquiry about ${property.name} has been ${status}`,
      link: `/u/inquiries/${inquiry._id}`
    });
  }

  return inquiry.populate(['userId', 'propertyId', 'unitId']);
};
