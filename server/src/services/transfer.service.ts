import { TransferRequest } from '../models/TransferRequest';
import { Tenancy } from '../models/Tenancy';
import { Unit } from '../models/Unit';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { Contract } from '../models/Contract';
import { Bill } from '../models/Bill';
import { Notification } from '../models/Notification';

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

const verifyPropertyManagementAccess = async (userId: string, propertyId: string) => {
  const user: any = await ensureUser(userId);
  const property: any = await Property.findById(propertyId);
  if (!property) {
    throwWithStatus('Property not found', 404);
  }

  if (user.role === 'super_admin') {
    return { user, property };
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

const ensureTargetUnitAvailability = (targetUnit: any) => {
  if (targetUnit.accommodationType === 'bedspace') {
    const slots = targetUnit.slots || [];
    const vacantSlot = slots.find((slot: any) => slot.status === 'vacant');
    if (!vacantSlot) {
      throwWithStatus('Target bedspace unit has no vacant slots', 400);
    }
    return { slotNumber: vacantSlot.slotNumber, isPrimary: false };
  }

  if (targetUnit.status !== 'vacant') {
    throwWithStatus(`Target unit is ${targetUnit.status} and cannot accept transfer`, 400);
  }

  return { slotNumber: undefined, isPrimary: true };
};

const releaseCurrentUnitOccupancy = async (tenancy: any, currentUnit: any) => {
  if (currentUnit.accommodationType === 'bedspace' && tenancy.slotNumber) {
    const slotIndex = currentUnit.slots?.findIndex((slot: any) => slot.slotNumber === tenancy.slotNumber);
    if (slotIndex !== undefined && slotIndex >= 0 && currentUnit.slots) {
      currentUnit.slots[slotIndex].status = 'vacant';
      currentUnit.slots[slotIndex].tenancyId = undefined;
    }

    const hasOccupiedSlots = currentUnit.slots?.some((slot: any) => slot.status === 'occupied');
    currentUnit.status = hasOccupiedSlots ? 'occupied' : 'vacant';
  } else {
    currentUnit.status = 'vacant';
  }

  await currentUnit.save();
};

const occupyTargetUnit = async (tenancy: any, targetUnit: any) => {
  const placement = ensureTargetUnitAvailability(targetUnit);

  if (targetUnit.accommodationType === 'bedspace') {
    const slotIndex = targetUnit.slots.findIndex((slot: any) => slot.slotNumber === placement.slotNumber);
    targetUnit.slots[slotIndex].status = 'occupied';
    targetUnit.slots[slotIndex].tenancyId = tenancy._id;

    const allOccupied = targetUnit.slots.every((slot: any) => slot.status === 'occupied');
    targetUnit.status = allOccupied ? 'occupied' : 'vacant';
  } else {
    targetUnit.status = 'occupied';
  }

  await targetUnit.save();
  return placement;
};

const getScopedPropertiesForManager = async (user: any) => {
  if (user.role === 'super_admin') {
    return null;
  }
  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: user._id }).select('_id');
    return properties.map((property: any) => property._id);
  }
  if (user.role === 'staff') {
    return user.assignedPropertyIds || [];
  }
  throwWithStatus('Access denied', 403);
};

export const createTransferRequest = async (userId: string, data: {
  tenancyId: string;
  toUnitId: string;
  reason: string;
}) => {
  const user: any = await ensureUser(userId);

  const tenancy: any = await Tenancy.findById(data.tenancyId).populate('propertyId unitId');
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }
  if (tenancy.status !== 'checked_in') {
    throwWithStatus('Only checked-in tenancies can request transfer', 400);
  }

  const property: any = tenancy.propertyId;
  const isTenantOwner = tenancy.userId.toString() === userId;
  const isLandlord = property.landlordId.toString() === userId;
  const isAdmin = user.role === 'super_admin';

  if (!isTenantOwner && !isLandlord && !isAdmin) {
    throwWithStatus('Only the tenant owner or landlord can initiate transfer', 403);
  }

  const toUnit: any = await Unit.findById(data.toUnitId).populate('propertyId');
  if (!toUnit) {
    throwWithStatus('Target unit not found', 404);
  }
  if (toUnit._id.toString() === tenancy.unitId._id.toString()) {
    throwWithStatus('Target unit must be different from current unit', 400);
  }

  const fromLandlordId = property.landlordId.toString();
  const toLandlordId = toUnit.propertyId.landlordId.toString();
  if (!isAdmin && fromLandlordId !== toLandlordId) {
    throwWithStatus('Transfer is only allowed between properties of the same landlord', 400);
  }

  ensureTargetUnitAvailability(toUnit);

  const existingPending = await TransferRequest.findOne({
    tenancyId: tenancy._id,
    status: { $in: ['pending', 'approved'] }
  });
  if (existingPending) {
    throwWithStatus('There is already an active transfer request for this tenancy', 409);
  }

  const transferRequest = await TransferRequest.create({
    tenancyId: tenancy._id,
    propertyId: tenancy.propertyId._id,
    fromUnitId: tenancy.unitId._id,
    toUnitId: toUnit._id,
    reason: data.reason,
    status: 'pending',
    initiatedByUserId: userId
  });

  await Notification.create({
    userId: property.landlordId,
    type: 'tenancy',
    title: 'New Transfer Request',
    message: `A transfer request was filed from ${tenancy.unitId.unitIdentifier} to ${toUnit.unitIdentifier}.`,
    link: `/hub/pipeline/transfers/${transferRequest._id}`,
    metadata: {
      transferRequestId: transferRequest._id.toString(),
      tenancyId: tenancy._id.toString()
    }
  });

  return TransferRequest.findById(transferRequest._id)
    .populate('tenancyId', 'status checkInDate')
    .populate('fromUnitId', 'unitIdentifier accommodationType')
    .populate('toUnitId', 'unitIdentifier accommodationType')
    .populate('initiatedByUserId', 'name role')
    .populate('reviewedBy', 'name role')
    .lean();
};

export const getMyTransferRequests = async (userId: string) => {
  const user: any = await ensureUser(userId);
  if (user.role !== 'user') {
    throwWithStatus('Access denied', 403);
  }

  const tenancies = await Tenancy.find({ userId }).select('_id');
  const tenancyIds = tenancies.map((tenancy: any) => tenancy._id);

  return TransferRequest.find({ tenancyId: { $in: tenancyIds } })
    .populate('tenancyId', 'status checkInDate checkOutDate')
    .populate('fromUnitId', 'unitIdentifier accommodationType')
    .populate('toUnitId', 'unitIdentifier accommodationType')
    .populate('initiatedByUserId', 'name role')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

export const getTransferRequests = async (
  userId: string,
  filters: { status?: string; propertyId?: string } = {}
) => {
  const user: any = await ensureUser(userId);
  const scopedPropertyIds = await getScopedPropertiesForManager(user);

  const query: any = {};
  if (scopedPropertyIds) {
    query.propertyId = { $in: scopedPropertyIds };
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    query.propertyId = filters.propertyId;
  }
  if (filters.status) {
    query.status = filters.status;
  }

  return TransferRequest.find(query)
    .populate('tenancyId', 'status checkInDate checkOutDate')
    .populate('fromUnitId', 'unitIdentifier accommodationType')
    .populate('toUnitId', 'unitIdentifier accommodationType')
    .populate('initiatedByUserId', 'name role')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

export const approveTransferRequest = async (userId: string, transferRequestId: string, reviewNotes?: string) => {
  const transferRequest: any = await TransferRequest.findById(transferRequestId).populate('tenancyId propertyId');
  if (!transferRequest) {
    throwWithStatus('Transfer request not found', 404);
  }

  if (transferRequest.status !== 'pending') {
    throwWithStatus(`Only pending requests can be approved. Current status: ${transferRequest.status}`, 400);
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId._id.toString());
  if (management.user.role === 'staff') {
    throwWithStatus('Only landlord can approve transfer requests', 403);
  }

  transferRequest.status = 'approved';
  transferRequest.reviewedBy = management.user._id;
  transferRequest.reviewedAt = new Date();
  transferRequest.reviewNotes = reviewNotes;
  await transferRequest.save();

  const tenancy: any = await Tenancy.findById(transferRequest.tenancyId);
  if (tenancy) {
    await Notification.create({
      userId: tenancy.userId,
      type: 'tenancy',
      title: 'Transfer Request Approved',
      message: 'Your transfer request has been approved and is ready for completion.',
      link: `/u/my-transfers/${transferRequest._id}`,
      metadata: {
        transferRequestId: transferRequest._id.toString(),
        tenancyId: tenancy._id.toString()
      }
    });
  }

  return TransferRequest.findById(transferRequest._id)
    .populate('tenancyId', 'status checkInDate')
    .populate('fromUnitId', 'unitIdentifier accommodationType')
    .populate('toUnitId', 'unitIdentifier accommodationType')
    .populate('initiatedByUserId', 'name role')
    .populate('reviewedBy', 'name role')
    .lean();
};

export const rejectTransferRequest = async (userId: string, transferRequestId: string, reviewNotes?: string) => {
  const transferRequest: any = await TransferRequest.findById(transferRequestId).populate('tenancyId propertyId');
  if (!transferRequest) {
    throwWithStatus('Transfer request not found', 404);
  }
  if (transferRequest.status !== 'pending') {
    throwWithStatus(`Only pending requests can be rejected. Current status: ${transferRequest.status}`, 400);
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId._id.toString());
  if (management.user.role === 'staff') {
    throwWithStatus('Only landlord can reject transfer requests', 403);
  }

  transferRequest.status = 'rejected';
  transferRequest.reviewedBy = management.user._id;
  transferRequest.reviewedAt = new Date();
  transferRequest.reviewNotes = reviewNotes;
  await transferRequest.save();

  const tenancy: any = await Tenancy.findById(transferRequest.tenancyId);
  if (tenancy) {
    await Notification.create({
      userId: tenancy.userId,
      type: 'tenancy',
      title: 'Transfer Request Rejected',
      message: reviewNotes ? `Your transfer request was rejected. Note: ${reviewNotes}` : 'Your transfer request was rejected.',
      link: `/u/my-transfers/${transferRequest._id}`,
      metadata: {
        transferRequestId: transferRequest._id.toString(),
        tenancyId: tenancy._id.toString()
      }
    });
  }

  return TransferRequest.findById(transferRequest._id)
    .populate('tenancyId', 'status checkInDate')
    .populate('fromUnitId', 'unitIdentifier accommodationType')
    .populate('toUnitId', 'unitIdentifier accommodationType')
    .populate('initiatedByUserId', 'name role')
    .populate('reviewedBy', 'name role')
    .lean();
};

export const completeTransferRequest = async (userId: string, transferRequestId: string) => {
  const transferRequest: any = await TransferRequest.findById(transferRequestId)
    .populate('tenancyId propertyId fromUnitId toUnitId');
  if (!transferRequest) {
    throwWithStatus('Transfer request not found', 404);
  }
  if (transferRequest.status !== 'approved') {
    throwWithStatus(`Only approved requests can be completed. Current status: ${transferRequest.status}`, 400);
  }

  const management = await verifyPropertyManagementAccess(userId, transferRequest.propertyId._id.toString());
  if (management.user.role === 'staff') {
    throwWithStatus('Only landlord can complete transfer requests', 403);
  }

  const tenancy: any = await Tenancy.findById(transferRequest.tenancyId)
    .populate('propertyId unitId contractId userId');
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }
  if (tenancy.status !== 'checked_in') {
    throwWithStatus('Only checked-in tenancies can be transferred', 400);
  }

  const fromUnit: any = await Unit.findById(transferRequest.fromUnitId);
  const toUnit: any = await Unit.findById(transferRequest.toUnitId).populate('propertyId');
  if (!fromUnit || !toUnit) {
    throwWithStatus('Transfer units not found', 404);
  }
  if (tenancy.unitId._id.toString() !== fromUnit._id.toString()) {
    throwWithStatus('Transfer source unit no longer matches tenancy unit', 409);
  }

  ensureTargetUnitAvailability(toUnit);

  await releaseCurrentUnitOccupancy(tenancy, fromUnit);
  const placement = await occupyTargetUnit(tenancy, toUnit);

  const previousUnitId = tenancy.unitId._id.toString();
  const previousPropertyId = tenancy.propertyId._id.toString();

  tenancy.unitId = toUnit._id;
  tenancy.propertyId = toUnit.propertyId._id || toUnit.propertyId;
  tenancy.slotNumber = placement.slotNumber;
  tenancy.isPrimary = placement.isPrimary;
  await tenancy.save();

  const contract: any = await Contract.findById(tenancy.contractId);
  if (contract) {
    contract.unitId = toUnit._id;
    contract.propertyId = toUnit.propertyId._id || toUnit.propertyId;
    await contract.save();
  }

  // Update future open bills so upcoming collections align to the new unit.
  const now = new Date();
  await Bill.updateMany(
    {
      tenancyId: tenancy._id,
      balanceAmount: { $gt: 0 },
      dueDate: { $gte: now },
      status: { $in: ['unpaid', 'partial', 'overdue'] }
    },
    {
      $set: {
        propertyId: toUnit.propertyId._id || toUnit.propertyId,
        unitId: toUnit._id
      }
    }
  );

  transferRequest.status = 'completed';
  transferRequest.completedAt = new Date();
  transferRequest.reviewedBy = management.user._id;
  transferRequest.reviewedAt = transferRequest.reviewedAt || new Date();
  await transferRequest.save();

  const tenant: any = tenancy.userId;
  const oldProperty: any = tenancy.propertyId;
  const toProperty: any = toUnit.propertyId;

  await Notification.create({
    userId: tenant._id,
    type: 'tenancy',
    title: 'Transfer Completed',
    message: `Your transfer to unit ${toUnit.unitIdentifier} is complete.`,
    link: '/u/my-room',
    metadata: {
      transferRequestId: transferRequest._id.toString(),
      tenancyId: tenancy._id.toString(),
      fromUnitId: previousUnitId,
      toUnitId: toUnit._id.toString()
    }
  });

  await Notification.create({
    userId: management.property.landlordId,
    type: 'tenancy',
    title: 'Tenant Transfer Completed',
    message: `${tenant.name} was transferred to ${toUnit.unitIdentifier}.`,
    link: `/hub/tenants/${tenancy._id}`,
    metadata: {
      transferRequestId: transferRequest._id.toString(),
      tenancyId: tenancy._id.toString(),
      fromPropertyId: previousPropertyId,
      toPropertyId: (toUnit.propertyId._id || toUnit.propertyId).toString()
    }
  });

  return {
    transferRequest: await TransferRequest.findById(transferRequest._id)
      .populate('tenancyId', 'status unitId propertyId')
      .populate('fromUnitId', 'unitIdentifier accommodationType')
      .populate('toUnitId', 'unitIdentifier accommodationType')
      .populate('initiatedByUserId', 'name role')
      .populate('reviewedBy', 'name role')
      .lean(),
    tenancy: await Tenancy.findById(tenancy._id)
      .populate('userId', 'name email phone avatar')
      .populate('propertyId', 'name address')
      .populate('unitId', 'unitIdentifier accommodationType slots status')
      .populate('contractId', 'status startDate endDate monthlyRent')
      .lean()
  };
};
