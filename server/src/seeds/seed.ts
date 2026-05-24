import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Contract } from '../models/Contract';
import { Tenancy } from '../models/Tenancy';
import { Bill } from '../models/Bill';
import { Inventory } from '../models/Inventory';
import { InventoryRecord } from '../models/InventoryRecord';
import { hash } from '../utils/password';
import { MOCK_PROPERTIES, MOCK_UNITS } from './seedData';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/rentdito');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  console.log('Clearing database...');
  // Clear all collections
  await User.deleteMany();
  await Property.deleteMany();
  await Unit.deleteMany();
  await Contract.deleteMany();
  await Tenancy.deleteMany();
  console.log('Database cleared!');
};

const seedUsers = async () => {
  console.log('Seeding users...');
  const defaultPassword = await hash('password123');

  const superAdmin = await User.create({ name: 'System Admin', email: 'admin@rentdito.com', phone: '09171234567', passwordHash: defaultPassword, role: 'super_admin', verificationStatus: 'verified' });

  const landlord1 = await User.create({ name: 'Juan Dela Cruz', email: 'landlord1@rentdito.com', phone: '09181234567', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified' });
  const landlord2 = await User.create({ name: 'Maria Santos', email: 'landlord2@rentdito.com', phone: '09191234567', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified' });

  const staff1 = await User.create({ name: 'Pedro Penduko', email: 'manager@rentdito.com', phone: '09201234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Manager', permissions: ['dashboard', 'properties', 'units', 'tenants', 'pipeline', 'maintenance'], verificationStatus: 'verified', landlordId: landlord1._id });
  const staff2 = await User.create({ name: 'Jose Rizal', email: 'maintenance@rentdito.com', phone: '09211234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Maintenance Staff', permissions: ['dashboard', 'maintenance', 'inventory'], verificationStatus: 'verified', landlordId: landlord1._id });
  const staff3 = await User.create({ name: 'Andres Bonifacio', email: 'finance@rentdito.com', phone: '09221234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Accountant', permissions: ['dashboard', 'billing', 'financials', 'reports'], verificationStatus: 'verified', landlordId: landlord2._id });
  const staff4 = await User.create({ name: 'Gabriela Silang', email: 'receptionist@rentdito.com', phone: '09231234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Front Desk Receptionist', permissions: ['dashboard', 'tenants', 'bookings', 'pipeline'], verificationStatus: 'verified', landlordId: landlord2._id });
  const staff5 = await User.create({ name: 'Test Staff', email: 'staff@rentdito.com', phone: '09241234567', passwordHash: defaultPassword, role: 'staff', positionName: 'General Staff', permissions: ['dashboard', 'properties'], verificationStatus: 'verified', landlordId: landlord1._id });

  const user1 = await User.create({ name: 'Luzviminda Macaraeg', email: 'user1@rentdito.com', phone: '09991112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user2 = await User.create({ name: 'Cardo Dalisay', email: 'user2@rentdito.com', phone: '09993334444', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user3 = await User.create({ name: 'Nena Reyes', email: 'user3@rentdito.com', phone: '09995556666', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user4 = await User.create({ name: 'Boyet Fernandez', email: 'user4@rentdito.com', phone: '09997778888', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });
  const user5 = await User.create({ name: 'Inday Bote', email: 'user5@rentdito.com', phone: '09999990000', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });
  const user6 = await User.create({ name: 'Ding Dantes', email: 'user6@rentdito.com', phone: '09881112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'pending' });

  return [superAdmin, landlord1, landlord2, staff1, staff2, staff3, staff4, staff5, user1, user2, user3, user4, user5, user6];
};

const seedProperties = async (users: any[]) => {
  console.log('Seeding properties...');

  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');
  const landlord2 = users.find((u: any) => u.email === 'landlord2@rentdito.com');

  const properties = [];
  
  for (let i = 0; i < MOCK_PROPERTIES.length; i++) {
    const mockProp = MOCK_PROPERTIES[i];
    const landlordId = i === 0 ? landlord1._id : landlord2._id;

    const newProp = await Property.create({
      landlordId,
      ...mockProp,
      billingSettings: { billingDay: 1, dueDay: 5, lateFeePercent: 5, utilityDefault: "metered" },
      emergencyContacts: []
    });
    properties.push(newProp);
  }

  return properties;
};

const seedUnits = async (properties: any[]) => {
  console.log('Seeding units...');
  
  for (const mockUnit of MOCK_UNITS) {
    const propertyId = properties[mockUnit.propertyIndex]._id;
    
    // Process slots if it's a bedspace
    let slots = [];
    if (mockUnit.accommodationType === 'bedspace' && mockUnit.capacity > 0) {
      for (let s = 1; s <= mockUnit.capacity; s++) {
        slots.push({ slotNumber: s, status: s === 1 ? 'occupied' : 'vacant' });
      }
    }

    const { propertyIndex, ...unitData } = mockUnit; // Remove propertyIndex so it doesn't go into Mongo

    await Unit.create({
      propertyId,
      ...unitData,
      slots: slots.length > 0 ? slots : undefined
    });
  }
};

const seedContractsAndTenancies = async (users: any[], properties: any[]) => {
  console.log('Seeding contracts & tenancies...');
  
  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const user2 = users.find((u: any) => u.email === 'user2@rentdito.com');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');

  const property = properties[0];
  const unit1 = await Unit.findOne({ propertyId: property._id }); // First unit

  // Create contract for user1
  // Mock application first (optional but required by schema)
  const contract1 = await Contract.create({
    applicationId: new mongoose.Types.ObjectId(), // Mock ID since we don't seed applications yet
    landlordId: landlord1._id,
    userId: user1._id,
    propertyId: property._id,
    unitId: unit1?._id,
    rateType: 'fixed',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    lockInPeriod: 6,
    monthlyRent: 8500,
    securityDeposit: 8500,
    advancePayment: 8500,
    status: 'active',
    landlordSignature: 'mock-signature-base64',
    userSignature: 'mock-signature-base64',
    signedAt: new Date()
  });

  // Create tenancy for user1
  const tenancy1 = await Tenancy.create({
    userId: user1._id,
    propertyId: property._id,
    unitId: unit1?._id,
    contractId: contract1._id,
    status: 'checked_in',
    checkInDate: new Date(),
    isPrimary: true,
    personalDetails: {
      fullName: user1.name,
      phone: user1.phone,
      occupation: 'Software Engineer',
      address: '123 Test St.',
      emergencyContact: {
        name: 'Emergency Contact 1',
        phone: '09000000000',
        relationship: 'Sibling'
      }
    },
    comments: [
      {
        userId: landlord1._id,
        role: 'caretaker',
        text: 'Tenant checked in successfully. Gave keys.',
        createdAt: new Date()
      },
      {
        userId: user1._id,
        role: 'tenant',
        text: 'Moved in, the room is clean. Thank you!',
        createdAt: new Date()
      }
    ]
  });

  // Set activeTenancy on user1
  await User.findByIdAndUpdate(user1._id, { activeTenancy: tenancy1._id });

  // Seed Utility Bills for tenancy1
  const today = new Date();
  for (let m = 0; m < 3; m++) {
    const month = today.getMonth() - m;
    const periodStart = new Date(today.getFullYear(), month, 1);
    const periodEnd = new Date(today.getFullYear(), month + 1, 0);
    const dueDate = new Date(today.getFullYear(), month + 1, 5);
    
    // Varying readings
    const elecPrev = 1500 + (m * 120);
    const elecCurr = elecPrev + 120 + Math.floor(Math.random() * 30);
    const elecCons = elecCurr - elecPrev;
    const elecRate = 12.5;
    const elecAmount = elecCons * elecRate;

    const waterPrev = 100 + (m * 15);
    const waterCurr = waterPrev + 15 + Math.floor(Math.random() * 5);
    const waterCons = waterCurr - waterPrev;
    const waterRate = 45;
    const waterAmount = waterCons * waterRate;

    const internetAmount = 1500;

    const totalUtility = elecAmount + waterAmount + internetAmount;
    const perHeadAmount = totalUtility / 2; // Assuming 2 occupants for bedspace example

    await Bill.create({
      tenancyId: tenancy1._id,
      propertyId: property._id,
      unitId: unit1?._id,
      contractId: contract1._id,
      type: 'utility',
      billingPeriod: { start: periodStart, end: periodEnd },
      rentAmount: 0,
      utilityAmount: perHeadAmount,
      penaltyAmount: 0,
      totalAmount: perHeadAmount,
      paidAmount: 0,
      balanceAmount: perHeadAmount,
      status: 'unpaid',
      dueDate,
      utilityBreakdown: {
        electricity: {
          previousReading: elecPrev,
          currentReading: elecCurr,
          consumption: elecCons,
          rate: elecRate,
          amount: elecAmount
        },
        water: {
          previousReading: waterPrev,
          currentReading: waterCurr,
          consumption: waterCons,
          rate: waterRate,
          amount: waterAmount
        },
        internet: { amount: internetAmount }
      },
      notes: `Shared utility: total ₱${totalUtility.toLocaleString()} divided by 2 occupant(s) = ₱${perHeadAmount.toLocaleString()} per occupant`,
      isAutoGenerated: false
    });
  }

  // Create a historical checked_out contract & tenancy for user2
  const pastStartDate = new Date(new Date().setFullYear(new Date().getFullYear() - 2));
  const pastEndDate = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
  const pastContract = await Contract.create({
    applicationId: new mongoose.Types.ObjectId(),
    landlordId: landlord1._id,
    userId: user2._id,
    propertyId: property._id,
    unitId: unit1?._id,
    rateType: 'fixed',
    startDate: pastStartDate,
    endDate: pastEndDate,
    lockInPeriod: 6,
    monthlyRent: 8000,
    securityDeposit: 8000,
    advancePayment: 8000,
    status: 'completed',
    landlordSignature: 'mock-signature-base64',
    userSignature: 'mock-signature-base64',
    signedAt: pastStartDate
  });

  await Tenancy.create({
    userId: user2._id,
    propertyId: property._id,
    unitId: unit1?._id,
    contractId: pastContract._id,
    status: 'checked_out',
    checkInDate: pastStartDate,
    checkOutDate: pastEndDate,
    isPrimary: true,
    personalDetails: {
      fullName: user2.name,
      phone: user2.phone,
      occupation: 'Designer',
      address: '456 Old St.',
    },
    comments: [
      {
        userId: landlord1._id,
        role: 'caretaker',
        text: 'Tenant checked out successfully. Unit left in good condition.',
        createdAt: pastEndDate
      }
    ]
  });
};

const seedInventory = async (users: any[], properties: any[]) => {
  console.log('Seeding inventory...');
  
  const staff1 = users.find((u: any) => u.email === 'manager@rentdito.com');
  const property = properties[0]; // First property
  const tenancy1 = await Tenancy.findOne({ propertyId: property._id });

  // Clear existing to avoid unique constraint issues
  await Inventory.deleteMany();
  await InventoryRecord.deleteMany();

  // Create Inventory Items
  const itemsData = [
    {
      propertyId: property._id,
      itemName: 'Samsung Split-type AC 1HP',
      serialNumber: 'SMC-9921-AC',
      condition: 'good',
      quantity: 5,
      availableQuantity: 4,
      status: 'available',
      purchaseDate: new Date('2023-01-15'),
      purchaseCost: 25000,
    },
    {
      propertyId: property._id,
      itemName: 'Office Desk Chair (Ergo)',
      condition: 'new',
      quantity: 10,
      availableQuantity: 8,
      status: 'available',
      purchaseDate: new Date('2025-11-10'),
      purchaseCost: 3500,
    },
    {
      propertyId: property._id,
      itemName: 'Microwave Oven (LG)',
      serialNumber: 'LG-MW-005',
      condition: 'damaged',
      quantity: 2,
      availableQuantity: 2,
      status: 'maintenance',
      purchaseDate: new Date('2022-05-20'),
      purchaseCost: 4500,
    }
  ];

  const createdItems = await Inventory.insertMany(itemsData);

  if (tenancy1 && staff1) {
    // Issue some items to the tenancy
    const acItem = createdItems.find(i => i.itemName.includes('Samsung'));
    const chairItem = createdItems.find(i => i.itemName.includes('Chair'));

    if (acItem && chairItem) {
      await InventoryRecord.insertMany([
        {
          inventoryItemId: acItem._id,
          tenancyId: tenancy1._id,
          propertyId: property._id,
          unitId: tenancy1.unitId,
          issuedByUserId: staff1._id,
          issuedDate: new Date(),
          quantityIssued: 1,
          issuedCondition: 'good',
          status: 'active'
        },
        {
          inventoryItemId: chairItem._id,
          tenancyId: tenancy1._id,
          propertyId: property._id,
          unitId: tenancy1.unitId,
          issuedByUserId: staff1._id,
          issuedDate: new Date(),
          quantityIssued: 2,
          issuedCondition: 'new',
          status: 'active'
        }
      ]);

      // Update available quantities
      await Inventory.findByIdAndUpdate(acItem._id, { $inc: { availableQuantity: -1 }, status: 'issued' });
      await Inventory.findByIdAndUpdate(chairItem._id, { $inc: { availableQuantity: -2 }, status: 'issued' });
    }
  }
};

const seedPayments = async (leases: any[]) => {
  console.log('Seeding payments...');
  // Placeholder logic
};

const seedMaintenanceRequests = async (properties: any[], users: any[]) => {
  console.log('Seeding maintenance requests...');
  // Placeholder logic
};

const seedNotifications = async (users: any[]) => {
  console.log('Seeding notifications...');
  // Placeholder logic
};

const runSeeder = async () => {
  console.log('Starting seed script...');
  try {
    await connectDB();
    await clearDatabase();

    // Call individual seed functions in order of dependencies
    const users = await seedUsers();
    const properties = await seedProperties(users);
    await seedUnits(properties);
    await seedContractsAndTenancies(users, properties);
    await seedInventory(users, properties);
    // const leases = await seedLeases(users, properties);
    // await seedPayments(leases);
    await seedMaintenanceRequests(properties, users);
    await seedNotifications(users);

    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding Failed: ${(error as Error).message}`);
    process.exit(1);
  }
};

// Execute
runSeeder();
