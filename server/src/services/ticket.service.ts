import { Ticket } from '../models/Ticket';
import { Tenancy } from '../models/Tenancy';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

type TicketListFilters = {
  propertyId?: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedToUserId?: string;
};

const throwWithStatus = (message: string, statusCode: number): never => {
  throw Object.assign(new Error(message), { statusCode });
};

const ensureUser = async (userId: string): Promise<any> => {
  const user: any = await User.findById(userId);
  if (!user) {
    throwWithStatus('User not found', 404);
  }
  return user;
};

const hasMaintenancePermission = (user: any): boolean => {
  return user.role !== 'staff' || Boolean(user.permissions?.includes('maintenance'));
};

const verifyPropertyManagementAccess = async (
  userId: string,
  propertyId: string,
  options: { requireMaintenancePermission?: boolean } = {}
) => {
  const user: any = await ensureUser(userId);
  const property: any = await Property.findById(propertyId);

  if (!property) {
    throwWithStatus('Property not found', 404);
  }

  if (user.role === 'super_admin') {
    return { user, property };
  }

  if (user.role === 'staff' && options.requireMaintenancePermission && !hasMaintenancePermission(user)) {
    throwWithStatus('Access denied. Missing permission: maintenance', 403);
  }

  const isLandlord = property.landlordId.toString() === userId;
  const isStaff =
    user.role === 'staff' &&
    user.assignedPropertyIds?.some((id: any) => id.toString() === propertyId);

  if (!isLandlord && !isStaff) {
    throwWithStatus('Access denied', 403);
  }

  return { user, property };
};

const populateTicket = (query: any) => {
  return query
    .populate({
      path: 'tenancyId',
      select: 'status checkInDate checkOutDate unitId userId',
      populate: [{ path: 'userId', select: 'name email avatar' }, { path: 'unitId', select: 'unitIdentifier' }]
    })
    .populate('propertyId', 'name address landlordId')
    .populate('unitId', 'unitIdentifier accommodationType')
    .populate('reportedByUserId', 'name email avatar')
    .populate('assignedToUserId', 'name email avatar positionName')
    .populate('assignedByUserId', 'name email')
    .populate('updates.userId', 'name role avatar');
};

const getManagedPropertyFilter = async (user: any) => {
  if (user.role === 'super_admin') {
    return null;
  }

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: user._id }).select('_id');
    return properties.map((p: any) => p._id);
  }

  if (user.role === 'staff') {
    if (!hasMaintenancePermission(user)) {
      throwWithStatus('Access denied. Missing permission: maintenance', 403);
    }
    return user.assignedPropertyIds || [];
  }

  throwWithStatus('Access denied', 403);
};

const canAccessTicket = async (
  userId: string,
  ticket: any,
  options: { managementOnly?: boolean; requireMaintenancePermission?: boolean } = {}
) => {
  const user: any = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return { user, property: null };
  }

  const reportedByUserId =
    ticket.reportedByUserId?._id?.toString?.() || ticket.reportedByUserId?.toString?.();
  const isOwner = reportedByUserId === userId;
  if (!options.managementOnly && isOwner) {
    return { user, property: null };
  }

  const propertyId = ticket.propertyId._id?.toString?.() || ticket.propertyId.toString();
  const result = await verifyPropertyManagementAccess(userId, propertyId, {
    requireMaintenancePermission: options.requireMaintenancePermission
  });
  return { user, property: result.property };
};

export const createTicket = async (userId: string, data: {
  tenancyId: string;
  title: string;
  description: string;
  category: 'plumbing' | 'electrical' | 'structural' | 'appliance' | 'pest' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  images?: string[];
}) => {
  const user: any = await ensureUser(userId);
  if (user.role !== 'user') {
    throwWithStatus('Only tenant users can create maintenance tickets', 403);
  }

  const tenancy: any = await Tenancy.findById(data.tenancyId).populate('propertyId unitId');
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }
  if (tenancy.userId.toString() !== userId) {
    throwWithStatus('You can only create tickets for your own tenancy', 403);
  }
  if (tenancy.status !== 'checked_in') {
    throwWithStatus('You must have an active checked-in tenancy to create a ticket', 400);
  }

  const ticket = await Ticket.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId._id || tenancy.propertyId,
    unitId: tenancy.unitId._id || tenancy.unitId,
    reportedByUserId: userId,
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority || 'medium',
    images: data.images || [],
    status: 'open',
    updates: []
  });

  const property: any = tenancy.propertyId;
  const landlordId = property.landlordId?.toString() || property.landlordId;
  if (landlordId) {
    await Notification.create({
      userId: landlordId,
      type: 'maintenance',
      title: 'New Maintenance Ticket',
      message: `${user.name} reported "${data.title}" at ${property.name}.`,
      link: `/hub/maintenance/tickets/${ticket._id}`,
      metadata: {
        ticketId: ticket._id.toString(),
        propertyId: property._id.toString(),
        tenancyId: tenancy._id.toString()
      }
    });
  }

  // Notify staff assigned to this property with maintenance module enabled.
  const assignedStaff = await User.find({
    role: 'staff',
    assignedPropertyIds: { $in: [property._id] },
    permissions: { $in: ['maintenance'] }
  }).select('_id');

  if (assignedStaff.length) {
    await Notification.insertMany(
      assignedStaff.map((staff: any) => ({
        userId: staff._id,
        type: 'maintenance',
        title: 'New Maintenance Ticket',
        message: `A new maintenance ticket was filed at ${property.name}.`,
        link: `/hub/maintenance/tickets/${ticket._id}`,
        metadata: {
          ticketId: ticket._id.toString(),
          propertyId: property._id.toString(),
          tenancyId: tenancy._id.toString()
        }
      }))
    );
  }

  return populateTicket(Ticket.findById(ticket._id)).lean();
};

export const getMyTickets = async (
  userId: string,
  filters: { status?: string; priority?: string; category?: string } = {}
) => {
  const user: any = await ensureUser(userId);
  if (user.role !== 'user') {
    throwWithStatus('Access denied', 403);
  }

  const query: any = { reportedByUserId: userId };
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;

  return populateTicket(Ticket.find(query))
    .sort({ createdAt: -1 })
    .lean();
};

export const getTickets = async (userId: string, filters: TicketListFilters = {}) => {
  const user: any = await ensureUser(userId);
  const managedPropertyIds = await getManagedPropertyFilter(user);

  const query: any = {};

  if (managedPropertyIds) {
    query.propertyId = { $in: managedPropertyIds };
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId, { requireMaintenancePermission: true });
    query.propertyId = filters.propertyId;
  }

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.assignedToUserId) query.assignedToUserId = filters.assignedToUserId;

  return populateTicket(Ticket.find(query))
    .sort({ createdAt: -1 })
    .lean();
};

export const getTicketById = async (userId: string, ticketId: string) => {
  const ticket: any = await populateTicket(Ticket.findById(ticketId)).lean();
  if (!ticket) {
    throwWithStatus('Ticket not found', 404);
  }

  await canAccessTicket(userId, ticket, { requireMaintenancePermission: true });
  return ticket;
};

export const assignTicket = async (userId: string, ticketId: string, staffId: string, mode: 'assign' | 'reassign') => {
  const ticket: any = await Ticket.findById(ticketId);
  if (!ticket) {
    throwWithStatus('Ticket not found', 404);
  }

  const actor: any = await ensureUser(userId);
  const property: any = await Property.findById(ticket.propertyId);
  if (!property) {
    throwWithStatus('Property not found', 404);
  }

  if (actor.role !== 'super_admin') {
    if (actor.role !== 'landlord' || property.landlordId.toString() !== userId) {
      throwWithStatus('Only the landlord can assign or reassign ticket staff', 403);
    }
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    throwWithStatus('Cannot assign a resolved or closed ticket', 400);
  }

  const staff: any = await User.findById(staffId);
  if (!staff || staff.role !== 'staff') {
    throwWithStatus('Staff member not found', 404);
  }
  if (!staff.assignedPropertyIds?.some((id: any) => id.toString() === property._id.toString())) {
    throwWithStatus('Staff is not assigned to this property', 400);
  }
  if (!staff.permissions?.includes('maintenance')) {
    throwWithStatus('Staff does not have maintenance permission', 400);
  }

  ticket.assignedToUserId = staff._id;
  ticket.assignedByUserId = actor._id;
  ticket.status = 'assigned';
  ticket.updates.push({
    userId: actor._id,
    message: mode === 'assign'
      ? `Assigned ticket to ${staff.name}.`
      : `Reassigned ticket to ${staff.name}.`,
    timestamp: new Date()
  });

  await ticket.save();

  await Notification.create({
    userId: staff._id,
    type: 'maintenance',
    title: mode === 'assign' ? 'Maintenance Ticket Assigned' : 'Maintenance Ticket Reassigned',
    message: `You were ${mode === 'assign' ? 'assigned' : 'reassigned'} ticket "${ticket.title}".`,
    link: `/hub/maintenance/tickets/${ticket._id}`,
    metadata: {
      ticketId: ticket._id.toString(),
      propertyId: ticket.propertyId.toString()
    }
  });

  return populateTicket(Ticket.findById(ticket._id)).lean();
};

export const addTicketUpdate = async (userId: string, ticketId: string, message: string) => {
  const ticket: any = await Ticket.findById(ticketId);
  if (!ticket) {
    throwWithStatus('Ticket not found', 404);
  }

  const { user } = await canAccessTicket(userId, ticket, { requireMaintenancePermission: true });

  if (ticket.status === 'closed') {
    throwWithStatus('Cannot add updates to a closed ticket', 400);
  }

  ticket.updates.push({
    userId,
    message,
    timestamp: new Date()
  });

  const propertyId = ticket.propertyId.toString();
  const isManagement =
    user.role === 'landlord' ||
    user.role === 'staff' ||
    user.role === 'super_admin';

  if (isManagement && (ticket.status === 'open' || ticket.status === 'assigned')) {
    await verifyPropertyManagementAccess(userId, propertyId, { requireMaintenancePermission: true });
    ticket.status = 'in_progress';
  }

  await ticket.save();

  if (ticket.reportedByUserId.toString() !== userId) {
    await Notification.create({
      userId: ticket.reportedByUserId,
      type: 'maintenance',
      title: 'Maintenance Ticket Updated',
      message: `Your ticket "${ticket.title}" has a new progress update.`,
      link: `/u/my-tickets/${ticket._id}`,
      metadata: {
        ticketId: ticket._id.toString(),
        propertyId: ticket.propertyId.toString()
      }
    });
  }

  return populateTicket(Ticket.findById(ticket._id)).lean();
};

export const resolveTicket = async (userId: string, ticketId: string, resolutionNotes: string) => {
  const ticket: any = await Ticket.findById(ticketId);
  if (!ticket) {
    throwWithStatus('Ticket not found', 404);
  }

  const { user } = await canAccessTicket(userId, ticket, {
    managementOnly: true,
    requireMaintenancePermission: true
  });

  if (ticket.status === 'closed') {
    throwWithStatus('Cannot resolve a closed ticket', 400);
  }
  if (ticket.status === 'resolved') {
    throwWithStatus('Ticket is already resolved', 400);
  }

  // Staff can resolve only if assigned to the ticket.
  if (user.role === 'staff' && ticket.assignedToUserId?.toString() !== userId) {
    throwWithStatus('Only the assigned staff can resolve this ticket', 403);
  }

  ticket.status = 'resolved';
  ticket.resolutionNotes = resolutionNotes;
  ticket.resolvedAt = new Date();
  ticket.updates.push({
    userId,
    message: 'Ticket marked as resolved.',
    timestamp: new Date()
  });
  await ticket.save();

  await Notification.create({
    userId: ticket.reportedByUserId,
    type: 'maintenance',
    title: 'Maintenance Ticket Resolved',
    message: `Your ticket "${ticket.title}" has been resolved.`,
    link: `/u/my-tickets/${ticket._id}`,
    metadata: {
      ticketId: ticket._id.toString(),
      propertyId: ticket.propertyId.toString()
    }
  });

  return populateTicket(Ticket.findById(ticket._id)).lean();
};

export const closeTicket = async (userId: string, ticketId: string, closingNotes?: string) => {
  const ticket: any = await Ticket.findById(ticketId);
  if (!ticket) {
    throwWithStatus('Ticket not found', 404);
  }

  const { user } = await canAccessTicket(userId, ticket, {
    managementOnly: true,
    requireMaintenancePermission: true
  });

  if (ticket.status !== 'resolved') {
    throwWithStatus('Only resolved tickets can be closed', 400);
  }

  ticket.status = 'closed';
  if (closingNotes) {
    ticket.updates.push({
      userId,
      message: `Closing note: ${closingNotes}`,
      timestamp: new Date()
    });
  }
  ticket.updates.push({
    userId,
    message: 'Ticket closed.',
    timestamp: new Date()
  });
  await ticket.save();

  if (ticket.reportedByUserId.toString() !== userId) {
    await Notification.create({
      userId: ticket.reportedByUserId,
      type: 'maintenance',
      title: 'Maintenance Ticket Closed',
      message: `Your ticket "${ticket.title}" has been closed.`,
      link: `/u/my-tickets/${ticket._id}`,
      metadata: {
        ticketId: ticket._id.toString(),
        propertyId: ticket.propertyId.toString()
      }
    });
  }

  return populateTicket(Ticket.findById(ticket._id)).lean();
};
