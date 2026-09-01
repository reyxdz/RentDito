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
import { Notification } from '../models/Notification';
import { RentalApplication } from '../models/RentalApplication';
import { VisitRequest } from '../models/VisitRequest';
import { TransferRequest } from '../models/TransferRequest';
import { Inquiry } from '../models/Inquiry';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Ticket } from '../models/Ticket';
import { Payment } from '../models/Payment';
import { LandlordApplication } from '../models/LandlordApplication';
import { Document } from '../models/Document';
import { IncidentReport } from '../models/IncidentReport';
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
  // Clear all collections written by this seeder
  await User.deleteMany();
  await Property.deleteMany();
  await Unit.deleteMany();
  await Contract.deleteMany();
  await Tenancy.deleteMany();
  await Bill.deleteMany();
  await Notification.deleteMany();
  await Inventory.deleteMany();
  await InventoryRecord.deleteMany();
  await RentalApplication.deleteMany();
  await VisitRequest.deleteMany();
  await TransferRequest.deleteMany();
  await Inquiry.deleteMany();
  await Conversation.deleteMany();
  await Message.deleteMany();
  await Ticket.deleteMany();
  await Payment.deleteMany();
  await LandlordApplication.deleteMany();
  await Document.deleteMany();
  await IncidentReport.deleteMany();
  console.log('Database cleared!');
};

const seedUsers = async () => {
  console.log('Seeding users...');
  const defaultPassword = await hash('password123');

  // Explicit, distinct `createdAt`/`updatedAt` per user (task 18a audit).
  // These were previously left to `{ timestamps: true }`'s implicit
  // `Date.now()` default -- harmless for `createdAt` in isolation (each of
  // these 14 `User.create({...})` calls is awaited individually, in
  // sequence, so they land on genuinely distinct milliseconds every run,
  // no batch tie) but NOT reproducible for `updatedAt`: line ~230 below
  // (`User.findByIdAndUpdate(user1._id, { activeTenancy: ... })`) bumps
  // ONLY user1's `updatedAt` to a fresh real-clock value, and
  // `admin.service.ts`'s `getAllVerifications` sorts by `updatedAt: -1` --
  // `all-verifications-super-admin` depends on the exact resulting order,
  // which a real-clock value can't guarantee stays put across reseeds.
  // `createdAt` here is pinned to the SAME simple ascending
  // declaration-order sequence that was already reproducing correctly
  // (`users-list-super-admin` / `platform-stats-super-admin`'s "recent
  // users" both already expect plain reverse-creation-order) -- fixed
  // now for the same reproducibility reason, not because it was broken.
  // `updatedAt` is set independently, matching
  // `all-verifications-super-admin`'s required order directly; the
  // `activeTenancy` update below pins the SAME `updatedAt` value for user1
  // explicitly so that later write doesn't silently override it with a
  // fresh clock read.
  // NOTE: `admin.service.ts`'s platform-stats `monthlyGrowth` chart groups
  // users by `$year`/`$month` of `createdAt` within a live
  // `new Date().setMonth(new Date().getMonth() - 6)` rolling window (real
  // clock, not seed-controlled) -- `platform-stats-super-admin` expects a
  // single `{ month: '2026-08', count: 14 }` bucket, so every user's
  // `createdAt` below is pinned to fixed August-2026 literals (this task's
  // "no bare `new Date()`" rule is about not READING the clock, not about
  // which fixed calendar month is chosen) rather than an arbitrary earlier
  // month that would fall outside that rolling window and return `[]`
  // instead. This one field aside, this endpoint's live-clock coupling is
  // a pre-existing fragility of the fixture itself (unrelated to the
  // ties/ids this audit fixes) that will eventually need a real fix or a
  // recapture once real time moves far enough past August 2026.
  const CREATED = (i: number) => new Date(Date.parse('2026-08-01T08:00:00.000Z') + i * 60_000);
  const UPDATED_RANK = (r: number) => new Date(Date.parse('2026-08-02T09:00:00.000Z') - r * 60_000);

  const superAdmin = await User.create({ name: 'System Admin', email: 'admin@rentdito.com', phone: '09171234567', passwordHash: defaultPassword, role: 'super_admin', verificationStatus: 'verified', createdAt: CREATED(0), updatedAt: UPDATED_RANK(2) });

  // `_id` pinned explicitly (task 18a audit): `contract.service.ts`'s
  // `getContractById` nests the reviewing RentalApplication's own raw
  // `reviewedBy` scalar (an un-populated ObjectId, one populate level
  // deeper than this query goes) into its response. That field name
  // doesn't end in "Id"/"_id", so `normalizeBody` doesn't collapse it to
  // the `'<ID>'` placeholder like every *populated*/`*Id`-suffixed
  // reference elsewhere -- it's compared by raw, literal value.
  // `contract-by-id-owner-user1`/`-landlord1`/`-expired` (all reviewed by
  // this same landlord1 in the original capture) all expect the literal
  // `6a93e154107b82fb635d8fde`. A fixed `_id` here reproduces that byte-
  // for-byte across reseeds, same as any other explicit-timestamp fix in
  // this audit -- everywhere else landlord1 is referenced via an
  // `*Id`-suffixed/populated field, so pinning this is a pure addition,
  // never a behavior change.
  const landlord1 = await User.create({ _id: new mongoose.Types.ObjectId('6a93e154107b82fb635d8fde'), name: 'Juan Dela Cruz', email: 'landlord1@rentdito.com', phone: '09181234567', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified', createdAt: CREATED(1), updatedAt: UPDATED_RANK(1) });
  const landlord2 = await User.create({ name: 'Maria Santos', email: 'landlord2@rentdito.com', phone: '09191234567', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified', createdAt: CREATED(2), updatedAt: UPDATED_RANK(9) });

  const staff1 = await User.create({ name: 'Pedro Penduko', email: 'manager@rentdito.com', phone: '09201234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Manager', permissions: ['dashboard', 'properties', 'units', 'tenants', 'pipeline', 'maintenance'], verificationStatus: 'verified', landlordId: landlord1._id, createdAt: CREATED(3), updatedAt: UPDATED_RANK(8) });
  const staff2 = await User.create({ name: 'Jose Rizal', email: 'maintenance@rentdito.com', phone: '09211234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Maintenance Staff', permissions: ['dashboard', 'maintenance', 'inventory'], verificationStatus: 'verified', landlordId: landlord1._id, createdAt: CREATED(4), updatedAt: UPDATED_RANK(7) });
  const staff3 = await User.create({ name: 'Andres Bonifacio', email: 'finance@rentdito.com', phone: '09221234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Accountant', permissions: ['dashboard', 'billing', 'financials', 'reports'], verificationStatus: 'verified', landlordId: landlord2._id, createdAt: CREATED(5), updatedAt: UPDATED_RANK(6) });
  const staff4 = await User.create({ name: 'Gabriela Silang', email: 'receptionist@rentdito.com', phone: '09231234567', passwordHash: defaultPassword, role: 'staff', positionName: 'Front Desk Receptionist', permissions: ['dashboard', 'tenants', 'bookings', 'pipeline'], verificationStatus: 'verified', landlordId: landlord2._id, createdAt: CREATED(6), updatedAt: UPDATED_RANK(5) });
  const staff5 = await User.create({ name: 'Test Staff', email: 'staff@rentdito.com', phone: '09241234567', passwordHash: defaultPassword, role: 'staff', positionName: 'General Staff', permissions: ['dashboard', 'properties'], verificationStatus: 'verified', landlordId: landlord1._id, createdAt: CREATED(7), updatedAt: UPDATED_RANK(4) });

  const user1 = await User.create({ name: 'Luzviminda Macaraeg', email: 'user1@rentdito.com', phone: '09991112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified', createdAt: CREATED(8), updatedAt: UPDATED_RANK(0) });
  const user2 = await User.create({ name: 'Cardo Dalisay', email: 'user2@rentdito.com', phone: '09993334444', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified', createdAt: CREATED(9), updatedAt: UPDATED_RANK(3) });
  const user3 = await User.create({ name: 'Nena Reyes', email: 'user3@rentdito.com', phone: '09995556666', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified', createdAt: CREATED(10), updatedAt: UPDATED_RANK(13) });
  const user4 = await User.create({ name: 'Boyet Fernandez', email: 'user4@rentdito.com', phone: '09997778888', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified', createdAt: CREATED(11), updatedAt: UPDATED_RANK(12) });
  const user5 = await User.create({ name: 'Inday Bote', email: 'user5@rentdito.com', phone: '09999990000', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified', createdAt: CREATED(12), updatedAt: UPDATED_RANK(11) });
  const user6 = await User.create({ name: 'Ding Dantes', email: 'user6@rentdito.com', phone: '09881112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'pending', createdAt: CREATED(13), updatedAt: UPDATED_RANK(10) });

  // Mongoose's `{ timestamps: true }` unconditionally overwrites
  // `updatedAt` to a fresh `Date.now()` on every `save()`/`create()` --
  // unlike `createdAt` (only set when absent), it ignores any explicit
  // `updatedAt` passed in the document data above, which is exactly why
  // every user's `updatedAt` above was silently coming back equal to its
  // own `createdAt` regardless of the `UPDATED_RANK(...)` value given.
  // Bypassing the Mongoose model (and its timestamps middleware) via the
  // driver's raw `.collection` handle is the only way to actually pin
  // these values, so `getAllVerifications`'s `.sort({ updatedAt: -1 })`
  // reproduces `all-verifications-super-admin`'s required order instead of
  // silently falling back to (reverse-)creation order.
  const usersByEmail = [superAdmin, landlord1, landlord2, staff1, staff2, staff3, staff4, staff5, user1, user2, user3, user4, user5, user6];
  const updatedAtByEmail: Record<string, Date> = {
    'admin@rentdito.com': UPDATED_RANK(2),
    'landlord1@rentdito.com': UPDATED_RANK(1),
    'landlord2@rentdito.com': UPDATED_RANK(9),
    'manager@rentdito.com': UPDATED_RANK(8),
    'maintenance@rentdito.com': UPDATED_RANK(7),
    'finance@rentdito.com': UPDATED_RANK(6),
    'receptionist@rentdito.com': UPDATED_RANK(5),
    'staff@rentdito.com': UPDATED_RANK(4),
    'user1@rentdito.com': UPDATED_RANK(0),
    'user2@rentdito.com': UPDATED_RANK(3),
    'user3@rentdito.com': UPDATED_RANK(13),
    'user4@rentdito.com': UPDATED_RANK(12),
    'user5@rentdito.com': UPDATED_RANK(11),
    'user6@rentdito.com': UPDATED_RANK(10),
  };
  for (const u of usersByEmail) {
    await User.collection.updateOne({ _id: u._id }, { $set: { updatedAt: updatedAtByEmail[u.email] } });
  }

  return usersByEmail;
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

  const units = [];
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

    const unit = await Unit.create({
      propertyId,
      ...unitData,
      slots: slots.length > 0 ? slots : undefined
    });
    units.push(unit);
  }
  return units;
};

const seedContractsAndTenancies = async (
  users: any[],
  properties: any[],
  units: any[],
  applications: { user1Application: any; user2ContractApplication: any; user3Application: any }
) => {
  console.log('Seeding contracts & tenancies...');

  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const user2 = users.find((u: any) => u.email === 'user2@rentdito.com');
  const user3 = users.find((u: any) => u.email === 'user3@rentdito.com');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');

  const property = properties[0];
  const unit1 = units.find((u: any) => u.propertyId.toString() === property._id.toString()); // First unit of property

  // Create contract for user1
  // applicationId references the real, approved RentalApplication seeded for this same
  // user + unit in seedRentalApplications (Contract.applicationId is required:true and a NOT
  // NULL FK in the Prisma schema, so it must resolve to a real row, not a mock ObjectId).
  const contract1 = await Contract.create({
    applicationId: applications.user1Application._id,
    landlordId: landlord1._id,
    userId: user1._id,
    propertyId: property._id,
    unitId: unit1?._id,
    rateType: 'fixed',
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: new Date('2027-01-01T00:00:00Z'),
    lockInPeriod: 6,
    monthlyRent: 8500,
    securityDeposit: 8500,
    advancePayment: 8500,
    status: 'active',
    landlordSignature: 'mock-signature-base64',
    userSignature: 'mock-signature-base64',
    signedAt: new Date('2026-01-01T00:00:00Z')
  });

  // Create tenancy for user1
  const tenancy1 = await Tenancy.create({
    userId: user1._id,
    propertyId: property._id,
    unitId: unit1?._id,
    contractId: contract1._id,
    status: 'checked_in',
    checkInDate: new Date('2026-01-02T00:00:00Z'),
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
        createdAt: new Date('2026-01-02T09:00:00Z')
      },
      {
        userId: user1._id,
        role: 'tenant',
        text: 'Moved in, the room is clean. Thank you!',
        createdAt: new Date('2026-01-02T18:00:00Z')
      }
    ]
  });

  // Set activeTenancy on user1 -- kept as the original Mongoose
  // `findByIdAndUpdate` call (NOT the raw `.collection` handle): `User`'s
  // schema never declared an `activeTenancy` field (it's computed live from
  // Postgres by the already-ported `user.service.ts#getMe` instead, see
  // that file), so under Mongoose's default strict mode this write is a
  // harmless no-op that never actually persists the field on the raw Mongo
  // document -- confirmed load-bearing: `users-list-super-admin`
  // (admin.service.ts's plain `.select().lean()`, which reads the raw
  // document with no such computed field) expects user1 to carry NO
  // `activeTenancy` key at all. Switching this to the raw driver bypasses
  // that strict-mode guard and DOES persist the field, which was tried and
  // reverted here after it broke that exact fixture.
  await User.findByIdAndUpdate(user1._id, { activeTenancy: tenancy1._id });

  // `updatedAt` pinned separately, via the raw `.collection` handle (task
  // 18a audit) -- the `findByIdAndUpdate` above still bumps it to a fresh
  // real-clock value via Mongoose's `{ timestamps: true }`
  // `pre('findOneAndUpdate')` hook (which, unlike the no-op `activeTenancy`
  // write above, DOES apply to a real schema-declared field), which would
  // reintroduce the exact non-determinism `all-verifications-super-admin`
  // (sorted by `updatedAt: -1`) depends on not having.
  await User.collection.updateOne(
    { _id: user1._id },
    { $set: { updatedAt: new Date(Date.parse('2026-08-02T09:00:00.000Z')) } }
  );

  // Seed Utility Bills for tenancy1 (3 months, most-recent first).
  // Fixed anchor date, and fixed per-month "meter reading" offsets, so totals reproduce
  // byte-for-byte across seed runs instead of depending on Math.random()/Date.now().
  const today = new Date('2026-03-15T00:00:00Z');
  const elecExtra = [10, 5, 20]; // indexed by m, replaces Math.floor(Math.random() * 30)
  const waterExtra = [2, 4, 1]; // indexed by m, replaces Math.floor(Math.random() * 5)

  // `createdAt` (Task 30c): under Mongoose's `{ timestamps: true }`, `Bill`
  // would otherwise auto-stamp `createdAt` to the REAL wall-clock instant
  // this seed script runs -- non-deterministic, and fatal for
  // `utility.service.ts#getConsumption`'s `createdAt` window filter
  // (`[now - (months-1) months, now]`), which only matches a bill seeded on
  // (or within ~6 months after) the same calendar day
  // `tests/golden-meta.json`'s frozen replay clock represents. A reseed run
  // even one day after that frozen instant pushes `createdAt` past `now`
  // and 0s out `consumption-landlord1` unconditionally -- not a
  // `getConsumption` bug, a seed-data non-determinism bug. Pinned to fixed
  // ISO literals well inside the frozen window (6-month lookback from
  // 2026-08-30T23:59:59.999Z resolves to [2026-02-28T16:00:00.000Z,
  // 2026-08-30T23:59:59.999Z]), strictly increasing by 1 second per bill in
  // the same m=0/m=1/m=2 loop order, matching seed-postgres.ts's identical
  // literals bill-for-bill so both stores agree byte-for-byte (createdAt is
  // stripped as VOLATILE by the fixture normalizer, so only the resulting
  // ORDER and window-membership matter, not the exact instant).
  const billCreatedAt = [
    new Date('2026-08-15T10:00:00.000Z'), // m=0
    new Date('2026-08-15T10:00:01.000Z'), // m=1
    new Date('2026-08-15T10:00:02.000Z'), // m=2
  ];
  const utilityBills: any[] = [];
  for (let m = 0; m < 3; m++) {
    const month = today.getMonth() - m;
    const periodStart = new Date(today.getFullYear(), month, 1);
    const periodEnd = new Date(today.getFullYear(), month + 1, 0);
    const dueDate = new Date(today.getFullYear(), month + 1, 5);

    // Varying readings
    const elecPrev = 1500 + (m * 120);
    const elecCurr = elecPrev + 120 + elecExtra[m];
    const elecCons = elecCurr - elecPrev;
    const elecRate = 12.5;
    const elecAmount = elecCons * elecRate;

    const waterPrev = 100 + (m * 15);
    const waterCurr = waterPrev + 15 + waterExtra[m];
    const waterCons = waterCurr - waterPrev;
    const waterRate = 45;
    const waterAmount = waterCons * waterRate;

    const internetAmount = 1500;

    const totalUtility = elecAmount + waterAmount + internetAmount;
    const perHeadAmount = totalUtility / 2; // Assuming 2 occupants for bedspace example

    const bill = await Bill.create({
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
      isAutoGenerated: false,
      createdAt: billCreatedAt[m]
    });
    utilityBills.push(bill);
  }

  // Create a historical checked_out contract & tenancy for user2
  const pastStartDate = new Date('2024-03-15T00:00:00Z');
  const pastEndDate = new Date('2025-03-15T00:00:00Z');
  const pastContract = await Contract.create({
    applicationId: applications.user2ContractApplication._id,
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
    status: 'expired',
    landlordSignature: 'mock-signature-base64',
    userSignature: 'mock-signature-base64',
    signedAt: pastStartDate
  });

  const expiringStartDate = new Date('2025-05-15T00:00:00Z');
  const expiringEndDate = new Date('2026-05-15T00:00:00Z');
  const expiringContract = await Contract.create({
    applicationId: applications.user3Application._id,
    landlordId: landlord1._id,
    userId: user3._id,
    propertyId: property._id,
    unitId: unit1?._id,
    rateType: 'fixed',
    startDate: expiringStartDate,
    endDate: expiringEndDate,
    lockInPeriod: 6,
    monthlyRent: 9000,
    securityDeposit: 9000,
    advancePayment: 9000,
    status: 'active',
    landlordSignature: 'mock-signature-base64',
    userSignature: 'mock-signature-base64',
    signedAt: expiringStartDate
  });

  const tenancy2 = await Tenancy.create({
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
      emergencyContact: {
        name: 'Emergency Contact 2',
        phone: '09111111111',
        relationship: 'Parent'
      }
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

  return { tenancy1, tenancy2, contract1, pastContract, expiringContract, utilityBills };
};

const seedInventory = async (users: any[], properties: any[]) => {
  console.log('Seeding inventory...');
  
  const staff1 = users.find((u: any) => u.email === 'manager@rentdito.com');
  const property = properties[0]; // First property
  const tenancy1 = await Tenancy.findOne({ propertyId: property._id, status: 'checked_in' });

  // Create Inventory Items. Explicit, distinct `createdAt` per row (task 18a
  // audit): confirmed live that all 3 rows of this bulk
  // `Inventory.insertMany([...])` (schema has `{ timestamps: true }`)
  // previously landed on the exact same millisecond, and that
  // `inventory.service.ts`'s `.sort({ createdAt: -1 })` resolved that tie to
  // ascending array-declaration order (AC, Chair, Microwave) -- verified as
  // the same order both `inventory-items-landlord1` and
  // `inventory-items-super-admin` already depend on.
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
      createdAt: new Date('2026-01-10T08:02:00.000Z'),
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
      createdAt: new Date('2026-01-10T08:01:00.000Z'),
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
      createdAt: new Date('2026-01-10T08:00:00.000Z'),
    }
  ];

  const createdItems = await Inventory.insertMany(itemsData);

  if (tenancy1 && staff1) {
    // Issue some items to the tenancy
    const acItem = createdItems.find(i => i.itemName.includes('Samsung'));
    const chairItem = createdItems.find(i => i.itemName.includes('Chair'));

    if (acItem && chairItem) {
      // Explicit, distinct `createdAt` per row (task 18a audit): this bulk
      // `InventoryRecord.insertMany([...])` (schema has `{ timestamps:
      // true }`) is a real-clock, unfixed tie risk exactly like the other
      // rows fixed in this audit (a prior real-clock reseed run tied both
      // rows to the same millisecond; another run left them 1ms apart --
      // either way non-deterministic). `inventory.service.ts`'s
      // `getInventoryRecords`-style reads sort by `createdAt: -1`, and
      // every fixture that lists both (`inventory-records-user1-own-tenancy`,
      // `-landlord1`, `-by-tenancy-owner`, `-by-tenancy-landlord1`, all
      // agreeing) expects [chairItem's record, acItem's record] -- these
      // fixed values reproduce that order exactly.
      await InventoryRecord.insertMany([
        {
          inventoryItemId: acItem._id,
          tenancyId: tenancy1._id,
          propertyId: property._id,
          unitId: tenancy1.unitId,
          issuedByUserId: staff1._id,
          issuedDate: new Date('2026-03-20T00:00:00Z'),
          quantityIssued: 1,
          issuedCondition: 'good',
          status: 'active',
          createdAt: new Date('2026-01-14T08:00:00.000Z')
        },
        {
          inventoryItemId: chairItem._id,
          tenancyId: tenancy1._id,
          propertyId: property._id,
          unitId: tenancy1.unitId,
          issuedByUserId: staff1._id,
          issuedDate: new Date('2026-03-20T00:00:00Z'),
          quantityIssued: 2,
          issuedCondition: 'new',
          status: 'active',
          createdAt: new Date('2026-01-14T08:01:00.000Z')
        }
      ]);

      // Update available quantities
      await Inventory.findByIdAndUpdate(acItem._id, { $inc: { availableQuantity: -1 }, status: 'issued' });
      await Inventory.findByIdAndUpdate(chairItem._id, { $inc: { availableQuantity: -2 }, status: 'issued' });
    }
  }
};

const seedRentalApplications = async (users: any[], properties: any[], units: any[]) => {
  console.log('Seeding rental applications...');

  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const user2 = users.find((u: any) => u.email === 'user2@rentdito.com');
  const user3 = users.find((u: any) => u.email === 'user3@rentdito.com');
  const user4 = users.find((u: any) => u.email === 'user4@rentdito.com');
  const user5 = users.find((u: any) => u.email === 'user5@rentdito.com');
  const user6 = users.find((u: any) => u.email === 'user6@rentdito.com');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');
  const landlord2 = users.find((u: any) => u.email === 'landlord2@rentdito.com');

  const property0 = properties[0];
  const property1 = properties[1];
  const unitsP0 = units.filter((u: any) => u.propertyId.toString() === property0._id.toString());
  const unitsP1 = units.filter((u: any) => u.propertyId.toString() === property1._id.toString());

  // NOTE on createdAt (task 18a audit -- see report for full detail): this
  // batch's 4 rows previously relied on Mongoose's implicit
  // `{ timestamps: true }` default, tying all 4 to the same millisecond on
  // every run. Unlike every other tie this audit found and fixed, this ONE
  // is a confirmed, PRE-EXISTING, structurally irreconcilable conflict in
  // the golden fixture corpus itself, not something a seed change can
  // resolve: `application.service.ts`'s `getApplications` runs the exact
  // same `.sort({ createdAt: -1 })` for both the landlord-scoped and
  // super-admin-scoped callers (differing only in the `propertyId` WHERE
  // clause), and the two golden fixtures that exercise it
  // (`applications-list-landlord1` / `applications-list-super-admin`) were
  // captured with DIRECTLY CONTRADICTORY relative order for this exact
  // (under_review, rejected) pair -- landlord1's fixture requires
  // rejected-before-under_review; super-admin's requires the reverse. No
  // single total order (tied or fully distinct) can satisfy both
  // simultaneously -- confirmed by testing both a real-clock tie (matches
  // neither reliably) and fully distinct timestamps (deterministically
  // satisfies exactly one, never both). Fully distinct timestamps below
  // satisfy `applications-list-super-admin`; `applications-list-landlord1`
  // is a KNOWN, remaining failure as a direct consequence -- flagged
  // prominently in the task report as a pre-existing defect this task
  // cannot fix without editing a golden fixture (forbidden by this task's
  // non-negotiables), for a future task to resolve (e.g. once
  // application.service.ts is ported and a real tie-break policy can be
  // chosen deliberately, or the fixture pair is reconciled directly).
  const applications = await RentalApplication.create([
    {
      // pending: distinct (userId, unitId) pair from the other active application below,
      // so the partial unique index on (userId, unitId, status) is never tripped.
      userId: user4._id,
      propertyId: property0._id,
      unitId: unitsP0[0]._id,
      personalDetails: {
        fullName: user4.name,
        phone: user4.phone,
        occupation: 'Student',
        school: 'Cebu Normal University',
        address: '12 Mabolo St., Cebu City',
        emergencyContact: { name: 'Fernandez Parent', phone: '09171112233', relationship: 'Parent' }
      },
      documents: ['/uploads/applications/user4-id.jpg'],
      status: 'pending',
      createdAt: new Date('2026-01-10T08:00:00.000Z')
    },
    {
      // under_review: different (userId, unitId) pair than the pending one above.
      userId: user5._id,
      propertyId: property0._id,
      unitId: unitsP0[1]._id,
      personalDetails: {
        fullName: user5.name,
        phone: user5.phone,
        occupation: 'Call Center Agent',
        address: '45 Lahug St., Cebu City',
        emergencyContact: { name: 'Bote Sibling', phone: '09172223344', relationship: 'Sibling' }
      },
      documents: ['/uploads/applications/user5-id.jpg'],
      status: 'under_review',
      createdAt: new Date('2026-01-10T08:03:00.000Z')
    },
    {
      userId: user2._id,
      propertyId: property1._id,
      unitId: unitsP1[0]._id,
      personalDetails: {
        fullName: user2.name,
        phone: user2.phone,
        occupation: 'Designer',
        address: '456 Old St., Cebu City',
        emergencyContact: { name: 'Emergency Contact 2', phone: '09111111111', relationship: 'Parent' }
      },
      documents: ['/uploads/applications/user2-id.jpg'],
      status: 'approved',
      reviewedBy: landlord2._id,
      reviewNotes: 'Documents verified, approved for move-in.',
      reviewedAt: new Date('2026-02-10T00:00:00Z'),
      createdAt: new Date('2026-01-10T08:01:00.000Z')
    },
    {
      userId: user6._id,
      propertyId: property0._id,
      unitId: unitsP0[2]._id,
      personalDetails: {
        fullName: user6.name,
        phone: user6.phone,
        occupation: 'Freelancer',
        address: '78 Banilad St., Cebu City',
        emergencyContact: { name: 'Dantes Parent', phone: '09173334455', relationship: 'Parent' }
      },
      documents: [],
      status: 'rejected',
      reviewedBy: landlord1._id,
      reviewNotes: 'Insufficient proof of income.',
      reviewedAt: new Date('2026-02-12T00:00:00Z'),
      createdAt: new Date('2026-01-10T08:02:00.000Z')
    }
  ]);

  // seedContractsAndTenancies wires each of its 3 contracts to a real, approved
  // RentalApplication for the same user + unit. Contract.applicationId is required:true and
  // becomes a NOT NULL FK to rental_applications in the Prisma schema, so a dangling mock
  // ObjectId here would both crash contract.service.ts's populate('applicationId') call today
  // and make the fixture unreplayable against Postgres later.
  //
  // These are separate approved RentalApplication rows from the 4 above, not a conversion of
  // any of them, so the pending/under_review/approved/rejected status coverage above is
  // unaffected. Multiple 'approved' rows for the same (userId, unitId) are fine -- the partial
  // unique index only constrains status in {pending, under_review}.
  const unit1 = unitsP0[0]; // matches the "first unit of property0" seedContractsAndTenancies resolves to

  // Explicit, distinct `createdAt` per row (task 18a audit): this second
  // batch's tie (previously the same implicit real-clock default as the
  // batch above, but LATER than it -- two separate `.create()` calls) had
  // no cross-fixture conflict (unlike the batch above): both
  // `applications-list-landlord1` and `applications-list-super-admin`
  // already agree these 3 rows sort [user3, user2, user1] (newest first),
  // so fully distinct values reproduce that exactly.
  const [user1Application, user2ContractApplication, user3Application] = await RentalApplication.create([
    {
      userId: user1._id,
      propertyId: property0._id,
      unitId: unit1._id,
      personalDetails: {
        fullName: user1.name,
        phone: user1.phone,
        occupation: 'Software Engineer',
        address: '123 Test St., Cebu City',
        emergencyContact: { name: 'Emergency Contact 1', phone: '09000000000', relationship: 'Sibling' }
      },
      documents: ['/uploads/applications/user1-id.jpg'],
      status: 'approved',
      reviewedBy: landlord1._id,
      reviewNotes: 'Approved for move-in.',
      reviewedAt: new Date('2025-12-20T00:00:00Z'),
      createdAt: new Date('2026-01-11T08:01:00.000Z')
    },
    {
      userId: user2._id,
      propertyId: property0._id,
      unitId: unit1._id,
      personalDetails: {
        fullName: user2.name,
        phone: user2.phone,
        occupation: 'Designer',
        address: '456 Old St., Cebu City',
        emergencyContact: { name: 'Emergency Contact 2', phone: '09111111111', relationship: 'Parent' }
      },
      documents: ['/uploads/applications/user2-past-id.jpg'],
      status: 'approved',
      reviewedBy: landlord1._id,
      reviewNotes: 'Approved for move-in.',
      reviewedAt: new Date('2024-03-01T00:00:00Z'),
      createdAt: new Date('2026-01-11T08:02:00.000Z')
    },
    {
      userId: user3._id,
      propertyId: property0._id,
      unitId: unit1._id,
      personalDetails: {
        fullName: user3.name,
        phone: user3.phone,
        occupation: 'Nurse',
        address: '789 New St., Cebu City',
        emergencyContact: { name: 'Reyes Sibling', phone: '09000000002', relationship: 'Sibling' }
      },
      documents: ['/uploads/applications/user3-id.jpg'],
      status: 'approved',
      reviewedBy: landlord1._id,
      reviewNotes: 'Approved for move-in.',
      reviewedAt: new Date('2025-05-01T00:00:00Z'),
      createdAt: new Date('2026-01-11T08:03:00.000Z')
    }
  ]);

  return { applications, user1Application, user2ContractApplication, user3Application };
};

const seedVisitRequests = async (users: any[], properties: any[], units: any[]) => {
  console.log('Seeding visit requests...');

  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const user2 = users.find((u: any) => u.email === 'user2@rentdito.com');
  const user3 = users.find((u: any) => u.email === 'user3@rentdito.com');
  const user4 = users.find((u: any) => u.email === 'user4@rentdito.com');
  const user5 = users.find((u: any) => u.email === 'user5@rentdito.com');
  const staff2 = users.find((u: any) => u.email === 'maintenance@rentdito.com');
  const staff4 = users.find((u: any) => u.email === 'receptionist@rentdito.com');

  const property0 = properties[0];
  const property1 = properties[1];
  const unitsP0 = units.filter((u: any) => u.propertyId.toString() === property0._id.toString());
  const unitsP1 = units.filter((u: any) => u.propertyId.toString() === property1._id.toString());

  // Explicit, distinct, strictly-increasing `createdAt` per row (task 18a):
  // `VisitRequestSchema` has `{ timestamps: true }`, and Mongoose's bulk
  // `Model.create([...])` runs each row's timestamp assignment fast enough
  // that all 5 rows previously landed on the EXACT SAME millisecond --
  // confirmed live (`2026-08-30T07:52:52.706Z` for all 5) -- leaving
  // `getPropertyVisits`'s `.sort({ createdAt: -1 })` (now Prisma's
  // `orderBy: { createdAt: 'desc' }`, ported task 18) with an arbitrary,
  // storage-order-dependent tie-break for property0's 3 visits
  // (`property-visits-landlord1`/`property-visits-super-admin`). Fixed
  // ISO literals only (no `Date.now()`, no bare `new Date()`), one fixed
  // minute apart per row, in the SAME array order `seed-postgres.ts`'s own
  // `nextCreatedAt()` already advances through for its 1:1 counterpart
  // array -- so both seeds agree on relative visit ordering.
  const visits = await VisitRequest.create([
    {
      userId: user1._id,
      propertyId: property0._id,
      unitId: unitsP0[0]._id,
      requestedDate: new Date('2026-02-01T00:00:00Z'),
      requestedTime: '10:00',
      purpose: 'viewing',
      status: 'pending',
      createdAt: new Date('2026-01-05T08:00:00.000Z')
    },
    {
      userId: user2._id,
      propertyId: property0._id,
      unitId: unitsP0[1]._id,
      requestedDate: new Date('2026-02-03T00:00:00Z'),
      requestedTime: '11:00',
      purpose: 'viewing',
      status: 'approved',
      createdAt: new Date('2026-01-05T08:01:00.000Z')
    },
    {
      userId: user3._id,
      propertyId: property1._id,
      unitId: unitsP1[0]._id,
      requestedDate: new Date('2026-02-05T00:00:00Z'),
      requestedTime: '14:00',
      scheduledDate: new Date('2026-02-06T00:00:00Z'),
      scheduledTime: '14:00',
      purpose: 'inspection',
      status: 'scheduled',
      assignedStaffId: staff2._id,
      createdAt: new Date('2026-01-05T08:02:00.000Z')
    },
    {
      userId: user4._id,
      propertyId: property0._id,
      unitId: unitsP0[0]._id,
      requestedDate: new Date('2026-01-20T00:00:00Z'),
      requestedTime: '09:00',
      scheduledDate: new Date('2026-01-21T00:00:00Z'),
      scheduledTime: '09:00',
      purpose: 'viewing',
      status: 'completed',
      assignedStaffId: staff4._id,
      createdAt: new Date('2026-01-05T08:03:00.000Z')
    },
    {
      userId: user5._id,
      propertyId: property1._id,
      unitId: unitsP1[1]._id,
      requestedDate: new Date('2026-01-25T00:00:00Z'),
      requestedTime: '13:00',
      purpose: 'viewing',
      status: 'cancelled',
      notes: 'Requester cancelled due to a schedule conflict.',
      createdAt: new Date('2026-01-05T08:04:00.000Z')
    }
  ]);

  return visits;
};

const seedTransferRequests = async (users: any[], properties: any[], units: any[], tenancy1: any) => {
  console.log('Seeding transfer requests...');

  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const staff1 = users.find((u: any) => u.email === 'manager@rentdito.com');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');

  const property0 = properties[0];
  const unitsP0 = units.filter((u: any) => u.propertyId.toString() === property0._id.toString());

  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that all 3 rows of this bulk `TransferRequest.create([...])` (schema has
  // `{ timestamps: true }`) previously landed on the exact same millisecond.
  // `transfer.service.ts`'s `.sort({ createdAt: -1 })` resolved that tie to
  // [pending, approved, completed] -- verified as the same order every
  // currently-passing fixture that lists multiple transfers already depends
  // on (`my-transfers-user1`, `transfers-list-landlord1`,
  // `transfers-list-super-admin`, all three agreeing), so these fixed values
  // reproduce it exactly rather than changing behavior.
  const transfers = await TransferRequest.create([
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      fromUnitId: unitsP0[0]._id,
      toUnitId: unitsP0[1]._id,
      reason: 'Tenant requested a move to a smaller room to reduce rent.',
      initiatedByUserId: user1._id,
      status: 'pending',
      createdAt: new Date('2026-01-07T08:02:00.000Z')
    },
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      fromUnitId: unitsP0[0]._id,
      toUnitId: unitsP0[2]._id,
      reason: 'Requested move due to noise complaints from a neighboring room.',
      initiatedByUserId: user1._id,
      status: 'approved',
      reviewedBy: staff1._id,
      reviewNotes: 'Approved, unit is available.',
      reviewedAt: new Date('2026-02-20T00:00:00Z'),
      createdAt: new Date('2026-01-07T08:01:00.000Z')
    },
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      fromUnitId: unitsP0[1]._id,
      toUnitId: unitsP0[2]._id,
      reason: 'Downsizing after roommate moved out.',
      createdAt: new Date('2026-01-07T08:00:00.000Z'),
      initiatedByUserId: staff1._id,
      status: 'completed',
      reviewedBy: landlord1._id,
      reviewNotes: 'Transfer completed successfully.',
      reviewedAt: new Date('2026-02-25T00:00:00Z'),
      completedAt: new Date('2026-02-27T00:00:00Z')
    }
  ]);

  return transfers;
};

const seedInquiriesConversationsAndMessages = async (users: any[], properties: any[], units: any[]) => {
  console.log('Seeding inquiries, conversations & messages...');

  const user4 = users.find((u: any) => u.email === 'user4@rentdito.com');
  const user5 = users.find((u: any) => u.email === 'user5@rentdito.com');
  const user6 = users.find((u: any) => u.email === 'user6@rentdito.com');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');
  const landlord2 = users.find((u: any) => u.email === 'landlord2@rentdito.com');

  const property0 = properties[0];
  const property1 = properties[1];
  const unitsP0 = units.filter((u: any) => u.propertyId.toString() === property0._id.toString());
  const unitsP1 = units.filter((u: any) => u.propertyId.toString() === property1._id.toString());

  // Inquiry 1: open, 2 messages, newest unread
  const inquiry1 = await Inquiry.create({
    userId: user4._id,
    propertyId: property0._id,
    unitId: unitsP0[0]._id,
    subject: 'Is WiFi included?',
    status: 'open'
  });
  const conversation1 = await Conversation.create({ inquiryId: inquiry1._id, participants: [user4._id, landlord1._id] });
  await Message.create({ conversationId: conversation1._id, senderId: user4._id, content: 'Hi, is WiFi included in the rent?', readBy: [landlord1._id] });
  await Message.create({ conversationId: conversation1._id, senderId: landlord1._id, content: 'Yes, WiFi is included in the rent.', readBy: [] });

  // Inquiry 2: in_progress, 3 messages, newest unread
  const inquiry2 = await Inquiry.create({
    userId: user5._id,
    propertyId: property1._id,
    unitId: unitsP1[0]._id,
    subject: 'Can I view the room this weekend?',
    status: 'in_progress'
  });
  const conversation2 = await Conversation.create({ inquiryId: inquiry2._id, participants: [user5._id, landlord2._id] });
  await Message.create({ conversationId: conversation2._id, senderId: user5._id, content: 'Can I view the room this weekend?', readBy: [landlord2._id] });
  await Message.create({ conversationId: conversation2._id, senderId: landlord2._id, content: 'Sure, Saturday 2pm works.', readBy: [user5._id] });
  await Message.create({ conversationId: conversation2._id, senderId: user5._id, content: 'Great, see you then!', readBy: [] });

  // Inquiry 3: closed, 4 messages, all read
  const inquiry3 = await Inquiry.create({
    userId: user6._id,
    propertyId: property0._id,
    unitId: unitsP0[2]._id,
    subject: 'Inquiry about deposit refund policy',
    status: 'closed'
  });
  const conversation3 = await Conversation.create({ inquiryId: inquiry3._id, participants: [user6._id, landlord1._id] });
  await Message.create({ conversationId: conversation3._id, senderId: user6._id, content: 'What is the deposit refund policy?', readBy: [landlord1._id] });
  await Message.create({ conversationId: conversation3._id, senderId: landlord1._id, content: 'Deposit is refunded within 30 days of check-out, less deductions.', readBy: [user6._id] });
  await Message.create({ conversationId: conversation3._id, senderId: user6._id, content: 'Understood, thank you!', readBy: [landlord1._id] });
  await Message.create({ conversationId: conversation3._id, senderId: landlord1._id, content: 'You are welcome. Closing this inquiry.', readBy: [user6._id] });

  return {
    inquiries: [inquiry1, inquiry2, inquiry3],
    conversations: [conversation1, conversation2, conversation3]
  };
};

const seedTickets = async (users: any[], properties: any[], tenancy1: any, tenancy2: any) => {
  console.log('Seeding tickets...');

  const user1 = users.find((u: any) => u.email === 'user1@rentdito.com');
  const user2 = users.find((u: any) => u.email === 'user2@rentdito.com');
  const staff1 = users.find((u: any) => u.email === 'manager@rentdito.com');
  const staff2 = users.find((u: any) => u.email === 'maintenance@rentdito.com');

  const property0 = properties[0];

  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that this array's bulk `Ticket.create([...])` (schema has `{ timestamps:
  // true }`) landed in two silent tie groups (`.768Z` x3, `.766Z` x2), and
  // `ticket.service.ts`'s `.sort({ createdAt: -1 })` (getMyTickets /
  // getTickets) resolved that tie to [assigned, in_progress, resolved, open,
  // closed] -- NOT ascending array-declaration order. Verified this exact
  // order is the one every currently-passing fixture that lists multiple
  // tickets already depends on (`my-tickets-user1`, `tickets-list-landlord1`,
  // `tickets-list-super-admin`), so these fixed values reproduce it exactly
  // rather than changing behavior -- only making it deterministic instead of
  // an accidental, storage-order-dependent tie-break.
  const tickets = await Ticket.create([
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      unitId: tenancy1.unitId,
      reportedByUserId: user1._id,
      title: 'Leaking faucet in bathroom',
      description: 'The bathroom faucet has been dripping continuously since yesterday.',
      category: 'plumbing',
      priority: 'medium',
      status: 'open',
      createdAt: new Date('2026-01-06T08:01:00.000Z')
    },
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      unitId: tenancy1.unitId,
      reportedByUserId: user1._id,
      title: 'Aircon not cooling',
      description: 'The split-type aircon runs but no longer cools the room.',
      category: 'appliance',
      priority: 'high',
      status: 'assigned',
      assignedToUserId: staff2._id,
      assignedByUserId: staff1._id,
      updates: [
        { userId: staff1._id, message: 'Assigned to Jose Rizal for inspection.', timestamp: new Date('2026-03-16T09:00:00Z') }
      ],
      createdAt: new Date('2026-01-06T08:04:00.000Z')
    },
    {
      tenancyId: tenancy1._id,
      propertyId: property0._id,
      unitId: tenancy1.unitId,
      reportedByUserId: user1._id,
      title: 'Flickering lights in room',
      description: 'Ceiling light flickers intermittently, possibly a wiring issue.',
      category: 'electrical',
      priority: 'urgent',
      status: 'in_progress',
      assignedToUserId: staff2._id,
      assignedByUserId: staff1._id,
      updates: [
        { userId: staff2._id, message: 'On-site, checking the wiring.', timestamp: new Date('2026-03-17T10:00:00Z') },
        { userId: user1._id, message: 'Thanks, waiting for the update.', timestamp: new Date('2026-03-17T12:00:00Z') }
      ],
      createdAt: new Date('2026-01-06T08:03:00.000Z')
    },
    {
      tenancyId: tenancy2._id,
      propertyId: property0._id,
      unitId: tenancy2.unitId,
      reportedByUserId: user2._id,
      title: 'Pest sighting in room corner',
      description: 'Cockroaches spotted near the corner cabinet.',
      category: 'pest',
      priority: 'low',
      status: 'resolved',
      assignedToUserId: staff2._id,
      assignedByUserId: staff1._id,
      updates: [
        { userId: staff2._id, message: 'Pest control scheduled for treatment.', timestamp: new Date('2024-11-05T09:00:00Z') }
      ],
      resolutionNotes: 'Pest control treated the area; no further sightings reported.',
      resolvedAt: new Date('2024-11-10T00:00:00Z'),
      createdAt: new Date('2026-01-06T08:02:00.000Z')
    },
    {
      tenancyId: tenancy2._id,
      propertyId: property0._id,
      unitId: tenancy2.unitId,
      reportedByUserId: user2._id,
      title: 'Broken window latch',
      description: 'Window latch is broken and the window does not close properly.',
      category: 'structural',
      priority: 'medium',
      status: 'closed',
      assignedToUserId: staff2._id,
      assignedByUserId: staff1._id,
      resolutionNotes: 'Latch replaced and verified working.',
      resolvedAt: new Date('2024-12-01T00:00:00Z'),
      createdAt: new Date('2026-01-06T08:00:00.000Z')
    }
  ]);

  return tickets;
};

const seedPayments = async (utilityBills: any[], users: any[]) => {
  console.log('Seeding payments...');

  const staff3 = users.find((u: any) => u.email === 'finance@rentdito.com');

  // utilityBills is produced by seedContractsAndTenancies in loop order m=0..2:
  //   [0] = newest month (left untouched -> stays unpaid, no payments recorded)
  //   [1] = middle month  (partially paid)
  //   [2] = oldest month  (fully paid)
  const partialBill = utilityBills[1];
  const paidBill = utilityBills[2];

  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that all 4 rows of this bulk `Payment.create([...])` (schema has
  // `{ timestamps: true }`) previously landed on the exact same millisecond.
  // `billing.service.ts`'s own `getPayments` (the flat payments-list
  // endpoint) sorts by `paymentDate`, not `createdAt` -- already distinct,
  // unaffected -- but `getBillById`'s NESTED `payments` field
  // (`Payment.find({ billId }).sort({ createdAt: -1 })`) does sort by
  // `createdAt`, and `bill-by-id-paid-with-payments` (the only fixture
  // that exercises it) expects [985/gcash, 1000/cash] -- these fixed
  // values reproduce that order exactly. The other bill's 2 payments
  // (900/500) aren't exercised order-sensitively by any fixture, so they
  // just get their own distinct, later values.
  const payments = await Payment.create([
    {
      billId: paidBill._id,
      tenancyId: paidBill.tenancyId,
      amount: 1000,
      paymentDate: new Date('2026-02-01T10:00:00Z'),
      method: 'cash',
      recordedByUserId: staff3._id,
      createdAt: new Date('2026-01-12T08:00:00.000Z')
    },
    {
      billId: paidBill._id,
      tenancyId: paidBill.tenancyId,
      amount: 985,
      paymentDate: new Date('2026-02-03T15:30:00Z'),
      method: 'gcash',
      referenceNumber: 'GC-2026-0001',
      recordedByUserId: staff3._id,
      createdAt: new Date('2026-01-12T08:01:00.000Z')
    },
    {
      billId: partialBill._id,
      tenancyId: partialBill.tenancyId,
      amount: 900,
      paymentDate: new Date('2026-03-01T09:00:00Z'),
      method: 'bank_transfer',
      referenceNumber: 'BT-2026-0002',
      recordedByUserId: staff3._id,
      createdAt: new Date('2026-01-12T08:02:00.000Z')
    },
    {
      billId: partialBill._id,
      tenancyId: partialBill.tenancyId,
      amount: 500,
      paymentDate: new Date('2026-03-02T14:00:00Z'),
      method: 'other',
      notes: 'Partial payment via money remittance center.',
      recordedByUserId: staff3._id,
      createdAt: new Date('2026-01-12T08:03:00.000Z')
    }
  ]);

  // Reconcile each affected Bill's paidAmount/balanceAmount/status against the sum of its
  // payments. paidBill's 2 payments sum to its full totalAmount -> paid, balance 0.
  // partialBill's 2 payments sum to less than its totalAmount -> partial, balance > 0.
  // unpaidBill receives no payments and is left at its seeded default (paidAmount 0,
  // balanceAmount === totalAmount, status 'unpaid').
  const paidTotal = 1000 + 985;
  await Bill.findByIdAndUpdate(paidBill._id, {
    paidAmount: paidTotal,
    balanceAmount: paidBill.totalAmount - paidTotal,
    status: 'paid'
  });

  const partialTotal = 900 + 500;
  await Bill.findByIdAndUpdate(partialBill._id, {
    paidAmount: partialTotal,
    balanceAmount: partialBill.totalAmount - partialTotal,
    status: 'partial'
  });

  return payments;
};

const seedLandlordApplicationsDocumentsAndIncidents = async (users: any[], properties: any[], tenancy1: any, tenancy2: any) => {
  console.log('Seeding landlord applications, documents & incident reports...');

  const user3 = users.find((u: any) => u.email === 'user3@rentdito.com');
  const user6 = users.find((u: any) => u.email === 'user6@rentdito.com');
  const superAdmin = users.find((u: any) => u.email === 'admin@rentdito.com');
  const staff2 = users.find((u: any) => u.email === 'maintenance@rentdito.com');
  const staff3 = users.find((u: any) => u.email === 'finance@rentdito.com');

  const property0 = properties[0];

  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that both rows of this bulk `LandlordApplication.create([...])` (schema
  // has `{ timestamps: true }`) previously landed on the exact same
  // millisecond. This collection's service is already ported to Prisma
  // (landlord-application.service.ts, task 15), so this Mongo tie no longer
  // feeds any live response -- fixed anyway for consistency, matching the
  // same relative order (approved newer than pending) that
  // `seed-postgres.ts`'s own `nextCreatedAt()` already produces for its 1:1
  // counterpart array (and that `all-applications-super-admin` already
  // depends on).
  await LandlordApplication.create([
    {
      userId: user6._id,
      businessName: 'Dantes Rental Ventures',
      businessType: 'Sole Proprietorship',
      documents: ['/uploads/landlord-applications/user6-permit.pdf'],
      status: 'pending',
      createdAt: new Date('2026-01-09T08:00:00.000Z')
    },
    {
      userId: user3._id,
      businessName: 'Macaraeg Properties',
      businessType: 'Sole Proprietorship',
      documents: ['/uploads/landlord-applications/user3-permit.pdf'],
      status: 'approved',
      reviewedBy: superAdmin._id,
      reviewedAt: new Date('2026-02-15T00:00:00Z'),
      reviewNotes: 'Documents verified, business permit valid.',
      createdAt: new Date('2026-01-09T08:01:00.000Z')
    }
  ]);

  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that both rows of this bulk `Document.create([...])` (schema has
  // `{ timestamps: true }`) previously landed on the exact same
  // millisecond. `document.service.ts`'s `.sort({ createdAt: -1 })`
  // resolved that tie to [receipt, contract] -- verified as the same order
  // both `documents-list-landlord1` and `documents-list-staff-maintenance`
  // already depend on, so these fixed values reproduce it exactly.
  await Document.create([
    {
      propertyId: property0._id,
      unitId: tenancy1.unitId,
      tenancyId: tenancy1._id,
      type: 'contract',
      title: 'Signed Lease Contract - User1',
      fileUrl: '/uploads/documents/contract-user1.pdf',
      uploadedBy: staff3._id,
      createdAt: new Date('2026-01-13T08:00:00.000Z')
    },
    {
      propertyId: property0._id,
      unitId: tenancy2.unitId,
      tenancyId: tenancy2._id,
      type: 'receipt',
      title: 'Final Move-out Receipt - User2',
      fileUrl: '/uploads/documents/receipt-user2.pdf',
      uploadedBy: staff3._id,
      createdAt: new Date('2026-01-13T08:01:00.000Z')
    }
  ]);

  // Explicit, distinct `createdAt` per row (task 18a audit): this bulk
  // `IncidentReport.create([...])` (schema has `{ timestamps: true }`) is
  // the same real-clock tie risk as the others fixed in this audit --
  // `security.service.ts`'s incidents list sorts by `createdAt: -1`, and
  // both `incidents-list-landlord1`/`incidents-list-staff-maintenance`
  // (which agree) expect [dispute, damage] -- these fixed values reproduce
  // that order exactly.
  await IncidentReport.create([
    {
      propertyId: property0._id,
      reportedBy: staff2._id,
      dateOfIncident: new Date('2026-02-18T00:00:00Z'),
      type: 'damage',
      severity: 'medium',
      description: 'Water damage found in the common area ceiling after heavy rain.',
      status: 'investigating',
      createdAt: new Date('2026-01-15T08:00:00.000Z')
    },
    {
      propertyId: property0._id,
      reportedBy: staff2._id,
      dateOfIncident: new Date('2026-01-05T00:00:00Z'),
      type: 'dispute',
      severity: 'low',
      description: 'Minor dispute between tenants over shared kitchen usage.',
      status: 'resolved',
      resolutionNotes: 'Mediated by staff; both parties agreed on a cleaning schedule.',
      createdAt: new Date('2026-01-15T08:01:00.000Z')
    }
  ]);
};

const seedNotifications = async (users: any[]) => {
  console.log('Seeding notifications...');
  const landlord1 = users.find((u: any) => u.email === 'landlord1@rentdito.com');
  
  // Explicit, distinct `createdAt` per row (task 18a audit): confirmed live
  // that both rows of this bulk `Notification.create([...])` (schema has
  // `{ timestamps: true }`) previously landed on the exact same millisecond.
  // The only fixture that lists both (`notifications-landlord1-has-two`)
  // expects ["New Inquiry Received", "Contract Expiring Soon"] in that
  // order -- these fixed values reproduce it exactly.
  await Notification.create([
    {
      userId: landlord1._id,
      type: 'inquiry',
      title: 'New Inquiry Received',
      message: 'You have a new inquiry for unit 101.',
      isRead: false,
      createdAt: new Date('2026-01-08T08:01:00.000Z')
    },
    {
      userId: landlord1._id,
      type: 'contract',
      title: 'Contract Expiring Soon',
      message: 'A contract for user3 is expiring in 2 months.',
      isRead: false,
      createdAt: new Date('2026-01-08T08:00:00.000Z')
    }
  ]);
};

const runSeeder = async () => {
  console.log('Starting seed script...');
  try {
    await connectDB();
    await clearDatabase();

    // Call individual seed functions in order of dependencies
    const users = await seedUsers();
    const properties = await seedProperties(users);
    const units = await seedUnits(properties);
    const rentalApplications = await seedRentalApplications(users, properties, units);
    const { tenancy1, tenancy2, utilityBills } = await seedContractsAndTenancies(users, properties, units, rentalApplications);
    await seedInventory(users, properties);
    await seedVisitRequests(users, properties, units);
    await seedTransferRequests(users, properties, units, tenancy1);
    await seedInquiriesConversationsAndMessages(users, properties, units);
    await seedTickets(users, properties, tenancy1, tenancy2);
    await seedPayments(utilityBills, users);
    await seedLandlordApplicationsDocumentsAndIncidents(users, properties, tenancy1, tenancy2);
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
