import { VisitRequest, IVisitRequest } from '../models/VisitRequest';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Notification } from '../models/Notification';

/**
 * Create visit request (user must be verified)
 */
export const createVisitRequest = async (
  userId: string,
  data: {
    propertyId: string;
    unitId?: string;
    requestedDate: Date;
    requestedTime: string;
    purpose: string;
    notes?: string;
  }
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.verificationStatus !== 'verified') {
    throw Object.assign(
      new Error('You must be verified to request visits'),
      { statusCode: 403 }
    );
  }

  const property = await Property.findById(data.propertyId);
  if (!property) {
    throw Object.assign(new Error('Property not found'), { statusCode: 404 });
  }

  if (data.unitId) {
    const unit = await Unit.findById(data.unitId);
    if (!unit || unit.propertyId.toString() !== data.propertyId) {
      throw Object.assign(new Error('Unit not found or does not belong to property'), { statusCode: 404 });
    }
  }

  const visitRequest = await VisitRequest.create({
    userId,
    propertyId: data.propertyId,
    unitId: data.unitId,
    requestedDate: data.requestedDate,
    requestedTime: data.requestedTime,
    purpose: data.purpose,
    notes: data.notes,
    status: 'pending'
  });

  await Notification.create({
    userId: property.landlordId,
    type: 'visit',
    title: 'New Visit Request',
    message: `${user.name} requested a visit to ${property.name}`,
    link: `/hub/bookings/visits/${visitRequest._id}`,
    metadata: {
      visitRequestId: visitRequest._id.toString(),
      propertyId: property._id.toString()
    }
  });

  return visitRequest.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Get user's own visit requests
 */
export const getMyVisits = async (userId: string) => {
  const visits = await VisitRequest.find({ userId })
    .populate('propertyId', 'name address images')
    .populate('unitId', 'unitIdentifier')
    .populate('assignedStaffId', 'name phone')
    .sort({ createdAt: -1 })
    .lean();

  return visits;
};

/**
 * Get visit requests for a property (landlord/staff only)
 */
export const getPropertyVisits = async (
  userId: string,
  propertyId: string,
  filters: { status?: string } = {}
) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

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

  const filter: any = { propertyId };
  if (filters.status) {
    filter.status = filters.status;
  }

  const visits = await VisitRequest.find(filter)
    .populate('userId', 'name email phone avatar')
    .populate('unitId', 'unitIdentifier')
    .populate('assignedStaffId', 'name phone')
    .sort({ createdAt: -1 })
    .lean();

  return visits;
};

/**
 * Check for double-booking conflicts
 */
const checkDoubleBooking = async (
  unitId: string,
  scheduledDate: Date,
  scheduledTime: string,
  excludeVisitId?: string
) => {
  const filter: any = {
    unitId,
    scheduledDate,
    scheduledTime,
    status: { $in: ['scheduled', 'approved'] }
  };

  if (excludeVisitId) {
    filter._id = { $ne: excludeVisitId };
  }

  const conflict = await VisitRequest.findOne(filter);
  return conflict;
};

/**
 * Approve visit request
 */
export const approveVisit = async (userId: string, visitId: string) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'pending') {
    throw Object.assign(new Error('Only pending visits can be approved'), { statusCode: 400 });
  }

  visit.status = 'approved';
  await visit.save();

  await Notification.create({
    userId: visit.userId,
    type: 'visit',
    title: 'Visit Request Approved',
    message: `Your visit request to ${property.name} has been approved`,
    link: `/u/visits/${visit._id}`,
    metadata: {
      visitRequestId: visit._id.toString(),
      propertyId: property._id.toString()
    }
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Schedule visit (set date/time)
 */
export const scheduleVisit = async (
  userId: string,
  visitId: string,
  data: { scheduledDate: Date; scheduledTime: string }
) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'approved' && visit.status !== 'pending') {
    throw Object.assign(new Error('Visit must be approved or pending to schedule'), { statusCode: 400 });
  }

  // Check for double-booking if unit is specified
  if (visit.unitId) {
    const conflict = await checkDoubleBooking(
      visit.unitId.toString(),
      data.scheduledDate,
      data.scheduledTime,
      visitId
    );

    if (conflict) {
      throw Object.assign(
        new Error('Time slot already booked for this unit'),
        { statusCode: 409 }
      );
    }
  }

  visit.scheduledDate = data.scheduledDate;
  visit.scheduledTime = data.scheduledTime;
  visit.status = 'scheduled';
  await visit.save();

  await Notification.create({
    userId: visit.userId,
    type: 'visit',
    title: 'Visit Scheduled',
    message: `Your visit to ${property.name} has been scheduled for ${data.scheduledDate.toLocaleDateString()} at ${data.scheduledTime}`,
    link: `/u/visits/${visit._id}`,
    metadata: {
      visitRequestId: visit._id.toString(),
      propertyId: property._id.toString(),
      scheduledDate: data.scheduledDate.toISOString(),
      scheduledTime: data.scheduledTime
    }
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Assign staff to visit
 */
export const assignStaff = async (
  userId: string,
  visitId: string,
  staffId: string
) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isAdmin) {
    throw Object.assign(new Error('Only landlord can assign staff'), { statusCode: 403 });
  }

  const staff = await User.findById(staffId);
  if (!staff || staff.role !== 'staff') {
    throw Object.assign(new Error('Staff member not found'), { statusCode: 404 });
  }

  if (!staff.assignedPropertyIds?.some(id => id.toString() === property._id.toString())) {
    throw Object.assign(new Error('Staff is not assigned to this property'), { statusCode: 400 });
  }

  visit.assignedStaffId = staff._id as any;
  await visit.save();

  await Notification.create({
    userId: staffId,
    type: 'visit',
    title: 'Visit Assigned',
    message: `You have been assigned to a visit at ${property.name}`,
    link: `/hub/bookings/visits/${visit._id}`,
    metadata: {
      visitRequestId: visit._id.toString(),
      propertyId: property._id.toString()
    }
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Complete visit
 */
export const completeVisit = async (userId: string, visitId: string) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'scheduled') {
    throw Object.assign(new Error('Only scheduled visits can be completed'), { statusCode: 400 });
  }

  visit.status = 'completed';
  await visit.save();

  await Notification.create({
    userId: visit.userId,
    type: 'visit',
    title: 'Visit Completed',
    message: `Your visit to ${property.name} has been marked as completed`,
    link: `/u/visits/${visit._id}`
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Cancel visit
 */
export const cancelVisit = async (userId: string, visitId: string) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isOwner = visit.userId.toString() === userId;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isOwner && !isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status === 'completed' || visit.status === 'cancelled') {
    throw Object.assign(new Error('Cannot cancel completed or already cancelled visit'), { statusCode: 400 });
  }

  visit.status = 'cancelled';
  await visit.save();

  const notifyUserId = isOwner ? property.landlordId : visit.userId;
  await Notification.create({
    userId: notifyUserId,
    type: 'visit',
    title: 'Visit Cancelled',
    message: `Visit to ${property.name} has been cancelled`,
    link: isOwner ? `/hub/bookings/visits/${visit._id}` : `/u/visits/${visit._id}`
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Mark visit as no-show
 */
export const markNoShow = async (userId: string, visitId: string) => {
  const visit = await VisitRequest.findById(visitId).populate('propertyId');
  if (!visit) {
    throw Object.assign(new Error('Visit request not found'), { statusCode: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const property = visit.propertyId as any;
  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some(id => id.toString() === property._id.toString());
  const isAdmin = user.role === 'super_admin';

  if (!isLandlord && !isStaff && !isAdmin) {
    throw Object.assign(new Error('Access denied'), { statusCode: 403 });
  }

  if (visit.status !== 'scheduled') {
    throw Object.assign(new Error('Only scheduled visits can be marked as no-show'), { statusCode: 400 });
  }

  visit.status = 'no_show';
  await visit.save();

  await Notification.create({
    userId: visit.userId,
    type: 'visit',
    title: 'Visit Marked as No-Show',
    message: `Your visit to ${property.name} was marked as no-show`,
    link: `/u/visits/${visit._id}`
  });

  return visit.populate(['userId', 'propertyId', 'unitId', 'assignedStaffId']);
};

/**
 * Create reminder notifications for visits 1 day before
 * This function will be called by a cron job in Phase 5
 */
export const createVisitReminders = async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfterTomorrow = new Date(tomorrow);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  const upcomingVisits = await VisitRequest.find({
    status: 'scheduled',
    scheduledDate: {
      $gte: tomorrow,
      $lt: dayAfterTomorrow
    }
  }).populate('propertyId userId assignedStaffId');

  for (const visit of upcomingVisits) {
    const property = visit.propertyId as any;
    const user = visit.userId as any;

    // Notify user
    await Notification.create({
      userId: visit.userId,
      type: 'visit',
      title: 'Visit Reminder',
      message: `Reminder: You have a visit scheduled tomorrow at ${property.name} at ${visit.scheduledTime}`,
      link: `/u/visits/${visit._id}`,
      metadata: {
        visitRequestId: visit._id.toString(),
        scheduledDate: visit.scheduledDate?.toISOString(),
        scheduledTime: visit.scheduledTime
      }
    });

    // Notify landlord
    await Notification.create({
      userId: property.landlordId,
      type: 'visit',
      title: 'Visit Reminder',
      message: `Reminder: ${user.name} has a visit scheduled tomorrow at ${property.name} at ${visit.scheduledTime}`,
      link: `/hub/bookings/visits/${visit._id}`,
      metadata: {
        visitRequestId: visit._id.toString(),
        scheduledDate: visit.scheduledDate?.toISOString(),
        scheduledTime: visit.scheduledTime
      }
    });

    // Notify assigned staff if any
    if (visit.assignedStaffId) {
      await Notification.create({
        userId: visit.assignedStaffId,
        type: 'visit',
        title: 'Visit Reminder',
        message: `Reminder: You have a visit assigned tomorrow at ${property.name} at ${visit.scheduledTime}`,
        link: `/hub/bookings/visits/${visit._id}`,
        metadata: {
          visitRequestId: visit._id.toString(),
          scheduledDate: visit.scheduledDate?.toISOString(),
          scheduledTime: visit.scheduledTime
        }
      });
    }
  }

  return upcomingVisits.length;
};
