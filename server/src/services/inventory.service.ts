import { Inventory } from '../models/Inventory';
import { InventoryRecord } from '../models/InventoryRecord';
import { Property } from '../models/Property';
import { Tenancy } from '../models/Tenancy';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

type InventoryFilters = {
  propertyId?: string;
  status?: string;
  condition?: string;
  search?: string;
};

type InventoryRecordFilters = {
  propertyId?: string;
  tenancyId?: string;
  status?: string;
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

const getManagedPropertyIds = async (userId: string) => {
  const user: any = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return null;
  }

  if (user.role === 'landlord') {
    const properties = await Property.find({ landlordId: userId }).select('_id');
    return properties.map(property => property._id);
  }

  if (user.role === 'staff') {
    if (!hasInventoryPermission(user)) {
      throwWithStatus('Access denied. Missing permission: inventory', 403);
    }
    return user.assignedPropertyIds || [];
  }

  throwWithStatus('Access denied', 403);
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
  if (user.role === 'staff' && !hasInventoryPermission(user)) {
    throwWithStatus('Access denied. Missing permission: inventory', 403);
  }
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some((id: any) => id.toString() === propertyId);

  if (!isLandlord && !isStaff) {
    throwWithStatus('Access denied', 403);
  }

  return { user, property };
};

const verifyTenancyAccess = async (userId: string, tenancyId: string) => {
  const tenancy: any = await Tenancy.findById(tenancyId).populate('propertyId');
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }

  const user: any = await ensureUser(userId);

  if (user.role === 'super_admin') {
    return tenancy;
  }

  const isOwner = tenancy.userId.toString() === userId;
  const isLandlord = tenancy.propertyId?.landlordId?.toString() === userId;
  if (user.role === 'staff' && !hasInventoryPermission(user)) {
    throwWithStatus('Access denied. Missing permission: inventory', 403);
  }
  const isStaff = user.role === 'staff' && user.assignedPropertyIds?.some(
    (id: any) => id.toString() === tenancy.propertyId._id.toString()
  );

  if (!isOwner && !isLandlord && !isStaff) {
    throwWithStatus('Access denied', 403);
  }

  return tenancy;
};

const isManagementRole = (role?: string) => {
  return role === 'landlord' || role === 'staff' || role === 'super_admin';
};

const hasInventoryPermission = (user: any) => {
  return user.role !== 'staff' || Boolean(user.permissions?.includes('inventory'));
};

export const getInventoryItems = async (userId: string, filters: InventoryFilters = {}) => {
  const user: any = await ensureUser(userId);
  if (!isManagementRole(user.role)) {
    throwWithStatus('Access denied', 403);
  }

  const managedPropertyIds = await getManagedPropertyIds(userId);
  const query: any = {};

  if (managedPropertyIds) {
    query.propertyId = { $in: managedPropertyIds };
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    query.propertyId = filters.propertyId;
  }

  if (filters.status) query.status = filters.status;
  if (filters.condition) query.condition = filters.condition;

  if (filters.search) {
    const regex = new RegExp(filters.search, 'i');
    query.$or = [{ itemName: regex }, { serialNumber: regex }];
  }

  return Inventory.find(query)
    .populate('propertyId', 'name address')
    .sort({ createdAt: -1 })
    .lean();
};

export const createInventoryItem = async (userId: string, data: {
  propertyId: string;
  itemName: string;
  serialNumber?: string;
  condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  quantity: number;
  status?: 'available' | 'issued' | 'maintenance' | 'retired';
  purchaseDate?: string;
  purchaseCost?: number;
}) => {
  await verifyPropertyManagementAccess(userId, data.propertyId);

  const normalizedSerial = data.serialNumber?.trim() || undefined;
  if (normalizedSerial) {
    const serialConflict = await Inventory.findOne({
      propertyId: data.propertyId,
      serialNumber: normalizedSerial
    });
    if (serialConflict) {
      throwWithStatus('Inventory serial number already exists in this property', 409);
    }
  }

  const quantity = Math.max(1, data.quantity);
  const inventory = await Inventory.create({
    propertyId: data.propertyId,
    itemName: data.itemName,
    serialNumber: normalizedSerial,
    condition: data.condition || 'good',
    quantity,
    availableQuantity: quantity,
    status: data.status || 'available',
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
    purchaseCost: data.purchaseCost
  });

  return inventory.populate('propertyId', 'name address');
};

export const updateInventoryItem = async (userId: string, itemId: string, updates: {
  itemName?: string;
  serialNumber?: string;
  condition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  quantity?: number;
  status?: 'available' | 'issued' | 'maintenance' | 'retired';
  purchaseDate?: string;
  purchaseCost?: number;
}) => {
  const item: any = await Inventory.findById(itemId);
  if (!item) {
    throwWithStatus('Inventory item not found', 404);
  }

  await verifyPropertyManagementAccess(userId, item.propertyId.toString());

  if (updates.serialNumber !== undefined) {
    const normalizedSerial = updates.serialNumber.trim();
    if (normalizedSerial) {
      const serialConflict = await Inventory.findOne({
        _id: { $ne: item._id },
        propertyId: item.propertyId,
        serialNumber: normalizedSerial
      });
      if (serialConflict) {
        throwWithStatus('Inventory serial number already exists in this property', 409);
      }
      item.serialNumber = normalizedSerial;
    } else {
      item.serialNumber = undefined;
    }
  }

  if (updates.itemName !== undefined) item.itemName = updates.itemName;
  if (updates.condition !== undefined) item.condition = updates.condition;
  if (updates.status !== undefined) item.status = updates.status;
  if (updates.purchaseDate !== undefined) {
    item.purchaseDate = updates.purchaseDate ? new Date(updates.purchaseDate) : undefined;
  }
  if (updates.purchaseCost !== undefined) item.purchaseCost = updates.purchaseCost;

  if (updates.quantity !== undefined) {
    const issuedCount = item.quantity - item.availableQuantity;
    if (updates.quantity < issuedCount) {
      throwWithStatus(
        `Quantity cannot be lower than currently issued count (${issuedCount})`,
        400
      );
    }
    item.quantity = updates.quantity;
    item.availableQuantity = updates.quantity - issuedCount;
  }

  if (item.availableQuantity <= 0 && item.status === 'available') {
    item.status = 'issued';
  } else if (item.availableQuantity > 0 && item.status === 'issued') {
    item.status = 'available';
  }

  await item.save();
  return item.populate('propertyId', 'name address');
};

export const issueInventoryItem = async (userId: string, itemId: string, data: {
  tenancyId: string;
  issuedDate?: string;
  quantityIssued?: number;
  signedFormUrl?: string;
}) => {
  const item: any = await Inventory.findById(itemId);
  if (!item) {
    throwWithStatus('Inventory item not found', 404);
  }

  if (item.status === 'retired') {
    throwWithStatus('Cannot issue a retired inventory item', 400);
  }
  if (item.status === 'maintenance') {
    throwWithStatus('Cannot issue an item currently under maintenance', 400);
  }

  const tenancy: any = await Tenancy.findById(data.tenancyId);
  if (!tenancy) {
    throwWithStatus('Tenancy not found', 404);
  }
  if (tenancy.status !== 'checked_in') {
    throwWithStatus('Can only issue items to checked-in tenants', 400);
  }

  await verifyPropertyManagementAccess(userId, item.propertyId.toString());

  if (tenancy.propertyId.toString() !== item.propertyId.toString()) {
    throwWithStatus('Inventory item and tenancy are not in the same property', 400);
  }

  const quantityIssued = data.quantityIssued || 1;
  if (quantityIssued > item.availableQuantity) {
    throwWithStatus(
      `Insufficient stock. Available: ${item.availableQuantity}, requested: ${quantityIssued}`,
      400
    );
  }

  const record = await InventoryRecord.create({
    inventoryItemId: item._id,
    tenancyId: tenancy._id,
    propertyId: item.propertyId,
    unitId: tenancy.unitId,
    issuedByUserId: userId,
    issuedDate: data.issuedDate ? new Date(data.issuedDate) : new Date(),
    quantityIssued,
    issuedCondition: item.condition,
    signedFormUrl: data.signedFormUrl || undefined,
    status: 'active'
  });

  item.availableQuantity -= quantityIssued;
  if (item.availableQuantity <= 0) {
    item.status = 'issued';
  }
  await item.save();

  await Notification.create({
    userId: tenancy.userId,
    type: 'system',
    title: 'Inventory Item Issued',
    message: `${item.itemName} has been issued to your tenancy.`,
    link: '/u/my-inventory',
    metadata: {
      inventoryRecordId: record._id.toString(),
      inventoryItemId: item._id.toString(),
      tenancyId: tenancy._id.toString()
    }
  });

  return record.populate([
    { path: 'inventoryItemId', select: 'itemName serialNumber condition status quantity availableQuantity' },
    { path: 'tenancyId', select: 'status checkInDate unitId propertyId userId' },
    { path: 'issuedByUserId', select: 'name role' }
  ]);
};

export const returnInventoryItem = async (userId: string, itemId: string, data: {
  recordId: string;
  returnDate?: string;
  returnCondition?: 'new' | 'good' | 'fair' | 'poor' | 'damaged';
  damageNotes?: string;
  isLost?: boolean;
}) => {
  const item: any = await Inventory.findById(itemId);
  if (!item) {
    throwWithStatus('Inventory item not found', 404);
  }

  await verifyPropertyManagementAccess(userId, item.propertyId.toString());

  const record: any = await InventoryRecord.findById(data.recordId);
  if (!record) {
    throwWithStatus('Inventory record not found', 404);
  }
  if (record.inventoryItemId.toString() !== itemId) {
    throwWithStatus('Record does not belong to this inventory item', 400);
  }
  if (record.status !== 'active') {
    throwWithStatus(`Only active records can be returned. Current status: ${record.status}`, 400);
  }

  record.returnDate = data.returnDate ? new Date(data.returnDate) : new Date();
  record.returnCondition = data.returnCondition || item.condition;
  if (data.damageNotes !== undefined) {
    record.damageNotes = data.damageNotes;
  }

  const isLost = Boolean(data.isLost);
  const isDamagedReturn = record.returnCondition === 'damaged';

  if (isLost) {
    record.status = 'lost';
    item.quantity = Math.max(0, item.quantity - record.quantityIssued);
    item.availableQuantity = Math.min(item.availableQuantity, item.quantity);
  } else if (isDamagedReturn) {
    record.status = 'damaged';
    item.status = 'maintenance';
  } else {
    record.status = 'returned';
    item.availableQuantity = Math.min(item.quantity, item.availableQuantity + record.quantityIssued);
  }

  if (item.availableQuantity <= 0 && item.status === 'available') {
    item.status = 'issued';
  } else if (item.availableQuantity > 0 && item.status === 'issued') {
    item.status = 'available';
  }

  await record.save();
  await item.save();

  return record.populate([
    { path: 'inventoryItemId', select: 'itemName serialNumber condition status quantity availableQuantity' },
    { path: 'tenancyId', select: 'status checkInDate unitId propertyId userId' },
    { path: 'issuedByUserId', select: 'name role' }
  ]);
};

export const reportRecordDamage = async (userId: string, recordId: string, data: {
  damageNotes: string;
  penaltyAmount: number;
  deductedFromDeposit?: boolean;
  status?: 'damaged' | 'lost';
}) => {
  const record: any = await InventoryRecord.findById(recordId);
  if (!record) {
    throwWithStatus('Inventory record not found', 404);
  }

  const item: any = await Inventory.findById(record.inventoryItemId);
  if (!item) {
    throwWithStatus('Inventory item not found', 404);
  }

  await verifyPropertyManagementAccess(userId, item.propertyId.toString());

  const previousStatus = record.status;
  const nextStatus = data.status || 'damaged';

  // If previously marked as returned and now being reclassified as damaged/lost,
  // remove that quantity from available stock.
  if (previousStatus === 'returned' && (nextStatus === 'damaged' || nextStatus === 'lost')) {
    item.availableQuantity = Math.max(0, item.availableQuantity - record.quantityIssued);
  }

  if (nextStatus === 'lost' && previousStatus !== 'lost') {
    item.quantity = Math.max(0, item.quantity - record.quantityIssued);
    item.availableQuantity = Math.min(item.availableQuantity, item.quantity);
  }

  if (nextStatus === 'damaged') {
    item.status = 'maintenance';
  } else if (item.availableQuantity <= 0 && item.status === 'available') {
    item.status = 'issued';
  }

  record.status = nextStatus;
  record.damageNotes = data.damageNotes;
  record.penaltyAmount = data.penaltyAmount;
  record.deductedFromDeposit = Boolean(data.deductedFromDeposit);

  await record.save();
  await item.save();

  return record.populate([
    { path: 'inventoryItemId', select: 'itemName serialNumber condition status quantity availableQuantity purchaseCost' },
    { path: 'tenancyId', select: 'status checkInDate unitId propertyId userId' },
    { path: 'issuedByUserId', select: 'name role' }
  ]);
};

export const getInventoryRecords = async (userId: string, filters: InventoryRecordFilters = {}) => {
  const user: any = await ensureUser(userId);
  const query: any = {};

  if (user.role === 'user') {
    const tenancyIds = (await Tenancy.find({ userId }).select('_id')).map(t => t._id);
    query.tenancyId = { $in: tenancyIds };
  } else {
    const managedPropertyIds = await getManagedPropertyIds(userId);
    if (managedPropertyIds) {
      query.propertyId = { $in: managedPropertyIds };
    }
  }

  if (filters.propertyId) {
    await verifyPropertyManagementAccess(userId, filters.propertyId);
    query.propertyId = filters.propertyId;
  }

  if (filters.tenancyId) {
    const tenancy = await verifyTenancyAccess(userId, filters.tenancyId);
    query.tenancyId = tenancy._id;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  return InventoryRecord.find(query)
    .populate('inventoryItemId', 'itemName serialNumber condition status quantity availableQuantity')
    .populate({
      path: 'tenancyId',
      select: 'status checkInDate checkOutDate unitId propertyId userId',
      populate: [{ path: 'unitId', select: 'unitIdentifier' }, { path: 'userId', select: 'name email avatar' }]
    })
    .populate('issuedByUserId', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

export const getInventoryRecordsByTenancy = async (userId: string, tenancyId: string) => {
  const tenancy = await verifyTenancyAccess(userId, tenancyId);

  return InventoryRecord.find({ tenancyId: tenancy._id })
    .populate('inventoryItemId', 'itemName serialNumber condition status quantity availableQuantity')
    .populate('issuedByUserId', 'name role')
    .sort({ createdAt: -1 })
    .lean();
};

export const getMonthlyInventoryReport = async (
  userId: string,
  options: { month?: number; year?: number; propertyId?: string } = {}
) => {
  const user: any = await ensureUser(userId);
  if (!isManagementRole(user.role)) {
    throwWithStatus('Access denied', 403);
  }

  const now = new Date();
  const month = options.month || now.getMonth() + 1;
  const year = options.year || now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throwWithStatus('Month must be between 1 and 12', 400);
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throwWithStatus('Year must be between 2000 and 2100', 400);
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);

  const query: any = {};
  const managedPropertyIds = await getManagedPropertyIds(userId);

  if (managedPropertyIds) {
    query.propertyId = { $in: managedPropertyIds };
  }

  if (options.propertyId) {
    await verifyPropertyManagementAccess(userId, options.propertyId);
    query.propertyId = options.propertyId;
  }

  const activeIssued = await InventoryRecord.countDocuments({
    ...query,
    status: 'active'
  });

  const lostDamaged = await InventoryRecord.countDocuments({
    ...query,
    status: { $in: ['lost', 'damaged'] },
    updatedAt: { $gte: start, $lt: end }
  });

  const mostDamagedItems = await InventoryRecord.aggregate([
    {
      $match: {
        ...query,
        status: { $in: ['lost', 'damaged'] },
        updatedAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: '$inventoryItemId',
        incidents: { $sum: 1 },
        lostCount: {
          $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
        },
        damagedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'damaged'] }, 1, 0] }
        },
        totalQuantityAffected: { $sum: '$quantityIssued' }
      }
    },
    {
      $lookup: {
        from: 'inventories',
        localField: '_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: '$item' },
    {
      $project: {
        _id: 0,
        inventoryItemId: '$_id',
        itemName: '$item.itemName',
        serialNumber: '$item.serialNumber',
        incidents: 1,
        lostCount: 1,
        damagedCount: 1,
        totalQuantityAffected: 1
      }
    },
    { $sort: { incidents: -1, itemName: 1 } },
    { $limit: 10 }
  ]);

  const depreciation = await InventoryRecord.aggregate([
    {
      $match: {
        ...query,
        status: { $in: ['lost', 'damaged'] },
        updatedAt: { $gte: start, $lt: end }
      }
    },
    {
      $group: {
        _id: '$inventoryItemId',
        lostQty: {
          $sum: {
            $cond: [{ $eq: ['$status', 'lost'] }, '$quantityIssued', 0]
          }
        },
        damagedQty: {
          $sum: {
            $cond: [{ $eq: ['$status', 'damaged'] }, '$quantityIssued', 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'inventories',
        localField: '_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: '$item' },
    {
      $project: {
        _id: 0,
        inventoryItemId: '$_id',
        itemName: '$item.itemName',
        serialNumber: '$item.serialNumber',
        purchaseCost: { $ifNull: ['$item.purchaseCost', 0] },
        lostQty: 1,
        damagedQty: 1,
        estimatedDepreciation: {
          $round: [
            {
              $add: [
                { $multiply: [{ $ifNull: ['$item.purchaseCost', 0] }, '$lostQty'] },
                { $multiply: [{ $ifNull: ['$item.purchaseCost', 0] }, '$damagedQty', 0.5] }
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { estimatedDepreciation: -1, itemName: 1 } }
  ]);

  const totalEstimatedDepreciation = depreciation.reduce((sum: number, item: any) => {
    return sum + (item.estimatedDepreciation || 0);
  }, 0);

  return {
    month,
    year,
    period: { start, end: new Date(end.getTime() - 1) },
    summary: {
      activeIssued,
      lostDamaged,
      mostFrequentlyDamagedItem: mostDamagedItems[0] || null,
      totalEstimatedDepreciation: Math.round(totalEstimatedDepreciation * 100) / 100
    },
    mostDamagedItems,
    depreciation
  };
};
