/**
 * Postgres counterpart of server/src/seeds/seed.ts.
 *
 * Mirrors the same 19 top-level Mongo collections (81 documents total) into the
 * relational schema, across all 27 Postgres tables, plus the 6 tables promoted
 * from embedded Mongo arrays (unit_slots, tenancy_comments, ticket_updates,
 * conversation_participants, message_reads, staff_property_assignments) and the
 * forward-only audit_logs table that has no Mongo counterpart at all.
 *
 * This is part of the strangler-transition dual-ID seed: every profile also
 * gets `legacyMongoId` set to the _id of the matching (already-seeded) Mongo
 * user, matched by the stable seed emails, so unported Mongo-backed services
 * can still be handed an id they understand.
 *
 * Determinism: every persisted business value (dates, money, readings) is a
 * fixed literal mirrored from seed.ts's arithmetic -- no Math.random(),
 * Date.now(), or bare `new Date()`. Primary keys are the one exception:
 * they are freshly generated UUIDs (crypto.randomUUID()), exactly as
 * `@default(uuid())` would generate them at insert time in normal operation --
 * this is identifier generation, not seed *data*, so determinism does not apply
 * to it. createdAt/updatedAt columns are left to their Prisma defaults
 * (`now()` / `@updatedAt`), matching how seed.ts never sets Mongoose's
 * automatic `timestamps: true` fields explicitly either.
 *
 * Idempotent: run() tears down (Postgres rows in reverse-FK order, then the
 * Supabase auth users it created, matched by the seed emails) before seeding,
 * so this script can run twice in a row.
 */

import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import prisma from '../config/prisma';
import { supabaseAdmin } from '../config/supabase';

// =============================================================================
// 1. Seed user roster (source: seed.ts seedUsers()). Order and content mirror
//    it exactly; the Mongo _id for each email is looked up live below.
// =============================================================================

interface UserSpec {
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'landlord' | 'staff' | 'super_admin';
  verificationStatus: 'unverified' | 'pending' | 'verified';
  positionName?: string;
  permissions?: string[];
  landlordEmail?: string;
}

const USER_SPECS: UserSpec[] = [
  { email: 'admin@rentdito.com', name: 'System Admin', phone: '09171234567', role: 'super_admin', verificationStatus: 'verified' },
  { email: 'landlord1@rentdito.com', name: 'Juan Dela Cruz', phone: '09181234567', role: 'landlord', verificationStatus: 'verified' },
  { email: 'landlord2@rentdito.com', name: 'Maria Santos', phone: '09191234567', role: 'landlord', verificationStatus: 'verified' },
  { email: 'manager@rentdito.com', name: 'Pedro Penduko', phone: '09201234567', role: 'staff', verificationStatus: 'verified', positionName: 'Manager', permissions: ['dashboard', 'properties', 'units', 'tenants', 'pipeline', 'maintenance'], landlordEmail: 'landlord1@rentdito.com' },
  { email: 'maintenance@rentdito.com', name: 'Jose Rizal', phone: '09211234567', role: 'staff', verificationStatus: 'verified', positionName: 'Maintenance Staff', permissions: ['dashboard', 'maintenance', 'inventory'], landlordEmail: 'landlord1@rentdito.com' },
  { email: 'finance@rentdito.com', name: 'Andres Bonifacio', phone: '09221234567', role: 'staff', verificationStatus: 'verified', positionName: 'Accountant', permissions: ['dashboard', 'billing', 'financials', 'reports'], landlordEmail: 'landlord2@rentdito.com' },
  { email: 'receptionist@rentdito.com', name: 'Gabriela Silang', phone: '09231234567', role: 'staff', verificationStatus: 'verified', positionName: 'Front Desk Receptionist', permissions: ['dashboard', 'tenants', 'bookings', 'pipeline'], landlordEmail: 'landlord2@rentdito.com' },
  { email: 'staff@rentdito.com', name: 'Test Staff', phone: '09241234567', role: 'staff', verificationStatus: 'verified', positionName: 'General Staff', permissions: ['dashboard', 'properties'], landlordEmail: 'landlord1@rentdito.com' },
  { email: 'user1@rentdito.com', name: 'Luzviminda Macaraeg', phone: '09991112222', role: 'user', verificationStatus: 'verified' },
  { email: 'user2@rentdito.com', name: 'Cardo Dalisay', phone: '09993334444', role: 'user', verificationStatus: 'verified' },
  { email: 'user3@rentdito.com', name: 'Nena Reyes', phone: '09995556666', role: 'user', verificationStatus: 'verified' },
  { email: 'user4@rentdito.com', name: 'Boyet Fernandez', phone: '09997778888', role: 'user', verificationStatus: 'unverified' },
  { email: 'user5@rentdito.com', name: 'Inday Bote', phone: '09999990000', role: 'user', verificationStatus: 'unverified' },
  { email: 'user6@rentdito.com', name: 'Ding Dantes', phone: '09881112222', role: 'user', verificationStatus: 'pending' },
];

const SEED_EMAILS = USER_SPECS.map((u) => u.email);
const DEFAULT_PASSWORD = 'password123';

// =============================================================================
// 2. Mongo lookup -- legacy_mongo_id per email (server/.env MONGO_URI, already
//    seeded by seed.ts; connects read-only, never writes to Mongo).
// =============================================================================

async function fetchLegacyMongoIds(): Promise<Record<string, string>> {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/rentdito';
  await mongoose.connect(uri);
  try {
    const col = mongoose.connection.db!.collection('users');
    const map: Record<string, string> = {};
    for (const email of SEED_EMAILS) {
      const doc = await col.findOne<{ _id: { toString(): string } }>({ email });
      if (!doc) {
        throw new Error(`FATAL: no Mongo user found for email "${email}" -- Mongo seed.ts must be run first.`);
      }
      map[email] = doc._id.toString();
    }
    return map;
  } finally {
    await mongoose.disconnect();
  }
}

// =============================================================================
// 3. Teardown -- Postgres rows in reverse-FK (leaf-to-root) order, then the
//    Supabase auth users this script owns. Makes the whole script idempotent.
// =============================================================================

async function teardownAuthUsers(): Promise<void> {
  const toDelete: string[] = [];
  let page = 1;
  // paginate defensively; 14 seed users will always fit on page 1, but this
  // does not assume that of the project overall.
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`FATAL: failed listing Supabase auth users: ${error.message}`);
    for (const u of data.users) {
      if (u.email && SEED_EMAILS.includes(u.email)) toDelete.push(u.id);
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  for (const id of toDelete) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(`FATAL: failed deleting Supabase auth user ${id}: ${error.message}`);
  }
  console.log(`Teardown: removed ${toDelete.length} pre-existing Supabase auth user(s).`);
}

async function teardownDatabase(): Promise<void> {
  console.log('Teardown: clearing Postgres tables (reverse-FK order)...');
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.ticketUpdate.deleteMany(),
    prisma.messageRead.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.inquiry.deleteMany(),
    prisma.document.deleteMany(),
    prisma.incidentReport.deleteMany(),
    prisma.landlordApplication.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.inventoryRecord.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.transferRequest.deleteMany(),
    prisma.visitRequest.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.bill.deleteMany(),
    prisma.tenancyComment.deleteMany(),
    prisma.unitSlot.deleteMany(),
    prisma.tenancy.deleteMany(),
    prisma.contract.deleteMany(),
    prisma.rentalApplication.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.property.deleteMany(),
    prisma.staffPropertyAssignment.deleteMany(),
    prisma.profile.deleteMany(),
  ]);
  console.log('Teardown: Postgres tables cleared.');
}

// =============================================================================
// 4. Profiles -- Supabase auth user first (profiles.id has a real FK to
//    auth.users), then the profile row with legacyMongoId set from Mongo.
// =============================================================================

async function seedProfiles(legacyIds: Record<string, string>): Promise<Record<string, string>> {
  console.log('Seeding profiles (Supabase auth users first)...');
  const profileIdByEmail: Record<string, string> = {};

  for (const spec of USER_SPECS) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: spec.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`FATAL: failed creating Supabase auth user for ${spec.email}: ${error?.message}`);
    }
    profileIdByEmail[spec.email] = data.user.id;
  }

  const rows = USER_SPECS.map((spec) => ({
    id: profileIdByEmail[spec.email],
    name: spec.name,
    email: spec.email,
    phone: spec.phone,
    role: spec.role,
    status: 'active' as const,
    verificationStatus: spec.verificationStatus,
    idPhotos: [] as string[],
    avatar: null,
    landlordId: spec.landlordEmail ? profileIdByEmail[spec.landlordEmail] : null,
    permissions: spec.permissions ?? [],
    positionName: spec.positionName ?? null,
    legacyMongoId: legacyIds[spec.email],
  }));

  await prisma.profile.createMany({ data: rows });
  console.log(`Seeded ${rows.length} profiles.`);
  return profileIdByEmail;
}

// =============================================================================
// main()
// =============================================================================

async function run() {
  console.log('Starting Postgres seed...');

  const legacyIds = await fetchLegacyMongoIds();
  console.log(`Resolved ${Object.keys(legacyIds).length} legacy Mongo user ids.`);

  // Database rows must go first: nearly every FK to profiles.id is
  // onDelete Restrict/SetNull (only profiles->auth.users itself cascades), so
  // deleting an auth user while its profile still has dependents (properties,
  // tenancies, contracts, ...) fails in Supabase with "Database error deleting
  // user". Clearing the Postgres tables down to profiles first, then deleting
  // the now-dependent-free auth users, is the only order that succeeds.
  await teardownDatabase();
  await teardownAuthUsers();

  const p = await seedProfiles(legacyIds);

  const email = (e: string) => p[e];
  const admin = email('admin@rentdito.com');
  const landlord1 = email('landlord1@rentdito.com');
  const landlord2 = email('landlord2@rentdito.com');
  const staff1 = email('manager@rentdito.com'); // Pedro Penduko
  const staff2 = email('maintenance@rentdito.com'); // Jose Rizal
  const staff3 = email('finance@rentdito.com'); // Andres Bonifacio
  const staff4 = email('receptionist@rentdito.com'); // Gabriela Silang
  const user1 = email('user1@rentdito.com');
  const user2 = email('user2@rentdito.com');
  const user3 = email('user3@rentdito.com');
  const user4 = email('user4@rentdito.com');
  const user5 = email('user5@rentdito.com');
  const user6 = email('user6@rentdito.com');

  // ===========================================================================
  // 5. Properties (source: seedData.ts MOCK_PROPERTIES + seed.ts seedProperties()).
  //    total_units/occupied_units/vacant_units/occupancy_rate are deliberately
  //    omitted -- refresh_property_metrics() computes them from `units`.
  // ===========================================================================
  console.log('Seeding properties...');
  const property0Id = randomUUID(); // White Dorm Property
  const property1Id = randomUUID(); // Uytengso Boardings House

  await prisma.property.createMany({
    data: [
      {
        id: property0Id,
        landlordId: landlord1,
        name: 'White Dorm Property',
        description:
          'A beautiful and well-maintained property. Ideal for students and young professionals seeking affordable and comfortable accommodation.',
        street: 'Sikatuna Street',
        barangay: null,
        city: 'Cebu City',
        province: 'Cebu',
        zipCode: '6543',
        country: 'Philippines',
        amenities: [],
        inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
        images: [
          '/src/assets/properties/white_dorm/images/image1.jpg',
          '/src/assets/properties/white_dorm/images/image2.jpg',
          '/src/assets/properties/white_dorm/images/image3.jpg',
        ],
        propertyType: 'MixedUse',
        status: 'Active',
        venues: {
          reviewCenters: [
            { name: 'Ecel Review Center', distance: '6 minutes walking' },
            { name: 'Manor Review Center', distance: '8 minutes walking' },
          ],
          schools: [
            { name: 'Velez College of Nursing', distance: '10 minutes walking' },
            { name: 'Cebu Normal University', distance: '10 minutes walking' },
          ],
          commercial: [{ name: 'Ayala Cebu Business Park', distance: '28 minutes walking' }],
        },
        emergencyContacts: [],
        billingDay: 1,
        dueDay: 5,
        lateFeePercent: 5,
        utilityDefault: 'metered',
        latitude: null,
        longitude: null,
      },
      {
        id: property1Id,
        landlordId: landlord2,
        name: 'Uytengso Boardings House',
        description:
          'A beautiful and well-maintained property. Ideal for students, young professionals, and reviewees seeking affordable and comfortable accommodation.',
        street: 'Uytengso Street',
        barangay: null,
        city: 'Cebu City',
        province: 'Cebu',
        zipCode: '6543',
        country: 'Philippines',
        amenities: [],
        inclusions: ['WiFi', 'Foam', 'Pillow', 'Table', 'Chair', 'Clip Fan', 'Electric Rice Cooker', 'Can Cook', 'Can Wash Clothes', 'No Curfew'],
        images: [
          '/src/assets/properties/uytengso/images/u.jpg',
          '/src/assets/properties/uytengso/images/y.jpg',
          '/src/assets/properties/uytengso/images/t.jpg',
        ],
        propertyType: 'BoardingHouse',
        status: 'Active',
        venues: {
          reviewCenters: [
            { name: 'Mega Review Center', distance: '4 minutes walking' },
            { name: 'Gold Rank Review Center', distance: '4 minutes walking' },
          ],
          schools: [
            { name: 'ACT', distance: '10 minutes walking' },
            { name: 'Cebu Normal University', distance: '5 minutes walking' },
          ],
          commercial: [{ name: 'Robinson Fuente', distance: '5 minutes commute' }],
        },
        emergencyContacts: [],
        billingDay: 1,
        dueDay: 5,
        lateFeePercent: 5,
        utilityDefault: 'metered',
        latitude: null,
        longitude: null,
      },
    ],
  });
  console.log('Seeded 2 properties.');

  // ===========================================================================
  // 6. Units (source: seedData.ts MOCK_UNITS). All 5 mock units are
  //    accommodationType 'room' -- seed.ts only creates Unit.slots[] entries
  //    for 'bedspace' units, so unit_slots stays empty (see report).
  //    seed.ts also never transitions Unit.status away from its seeded default
  //    even for the unit an active tenancy occupies (unit1/"Room 2"), so all 5
  //    units are mirrored here with status 'vacant', exactly as Mongo has them.
  // ===========================================================================
  console.log('Seeding units...');
  const unitRoom2Id = randomUUID(); // property0, index 0
  const unitRoom3Id = randomUUID(); // property0, index 1
  const unitRoom4Id = randomUUID(); // property0, index 2
  const unitP1Room1Id = randomUUID(); // property1, index 0
  const unitP1Door5Room2Id = randomUUID(); // property1, index 1

  await prisma.unit.createMany({
    data: [
      {
        id: unitRoom2Id,
        propertyId: property0Id,
        unitIdentifier: 'Room 2',
        accommodationType: 'room',
        images: ['/src/assets/properties/white_dorm/units/room2/room2_img1.jpg'],
        roomRent: 18000,
        bedspaceRent: 2500,
        perHeadRate: null,
        capacity: 8,
        maxOccupants: 8,
        sizeSqm: null,
        status: 'vacant',
        features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
        deposit: 5000,
      },
      {
        id: unitRoom3Id,
        propertyId: property0Id,
        unitIdentifier: 'Room 3',
        accommodationType: 'room',
        images: ['/src/assets/properties/white_dorm/units/room3/room3_img1.jpg'],
        roomRent: 10000,
        bedspaceRent: 2500,
        perHeadRate: null,
        capacity: 4,
        maxOccupants: 4,
        sizeSqm: null,
        status: 'vacant',
        features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
        deposit: 5000,
      },
      {
        id: unitRoom4Id,
        propertyId: property0Id,
        unitIdentifier: 'Room 4',
        accommodationType: 'room',
        images: ['/src/assets/properties/white_dorm/units/room4/room4_img1.jpg'],
        roomRent: 5000,
        bedspaceRent: 2500,
        perHeadRate: null,
        capacity: 2,
        maxOccupants: 2,
        sizeSqm: null,
        status: 'vacant',
        features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
        deposit: 5000,
      },
      {
        id: unitP1Room1Id,
        propertyId: property1Id,
        unitIdentifier: 'Room 1',
        accommodationType: 'room',
        images: ['/src/assets/properties/uytengso/units/room1/room1_t.jpg'],
        roomRent: 20000,
        bedspaceRent: 2500,
        perHeadRate: null,
        capacity: 8,
        maxOccupants: 8,
        sizeSqm: null,
        status: 'vacant',
        features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
        deposit: 5000,
      },
      {
        id: unitP1Door5Room2Id,
        propertyId: property1Id,
        unitIdentifier: 'Door 5 - Room 2',
        accommodationType: 'room',
        images: ['/src/assets/properties/uytengso/units/Door_5/room2/dr5r4.jpg'],
        roomRent: 2500,
        bedspaceRent: null,
        perHeadRate: null,
        capacity: 4,
        maxOccupants: 4,
        sizeSqm: null,
        status: 'vacant',
        features: ['Foam', 'Pillow', 'WiFi', 'Clip Fan', 'Table', 'Chair'],
        deposit: 5000,
      },
    ],
  });
  console.log('Seeded 5 units.');

  const unitsP0 = [unitRoom2Id, unitRoom3Id, unitRoom4Id];
  const unitsP1 = [unitP1Room1Id, unitP1Door5Room2Id];
  const unit1Id = unitsP0[0]; // "first unit of property0", matches seed.ts's seedContractsAndTenancies

  // ===========================================================================
  // 7. Rental applications (source: seed.ts seedRentalApplications()).
  //    7 rows: 4 standalone (pending/under_review/approved/rejected) + 3 that
  //    the 3 contracts below reference via their required applicationId FK.
  // ===========================================================================
  console.log('Seeding rental applications...');
  const appUser4Id = randomUUID(); // pending
  const appUser5Id = randomUUID(); // under_review
  const appUser2StandaloneId = randomUUID(); // approved (property1)
  const appUser6Id = randomUUID(); // rejected
  const appUser1Id = randomUUID(); // approved -> contract1
  const appUser2ContractId = randomUUID(); // approved -> pastContract
  const appUser3Id = randomUUID(); // approved -> expiringContract

  await prisma.rentalApplication.createMany({
    data: [
      {
        id: appUser4Id,
        userId: user4,
        propertyId: property0Id,
        unitId: unitsP0[0],
        pdFullName: 'Boyet Fernandez',
        pdPhone: '09997778888',
        pdOccupation: 'Student',
        pdSchool: 'Cebu Normal University',
        pdAddress: '12 Mabolo St., Cebu City',
        pdEmergencyName: 'Fernandez Parent',
        pdEmergencyPhone: '09171112233',
        pdEmergencyRelationship: 'Parent',
        documents: ['/uploads/applications/user4-id.jpg'],
        status: 'pending',
      },
      {
        id: appUser5Id,
        userId: user5,
        propertyId: property0Id,
        unitId: unitsP0[1],
        pdFullName: 'Inday Bote',
        pdPhone: '09999990000',
        pdOccupation: 'Call Center Agent',
        pdSchool: null,
        pdAddress: '45 Lahug St., Cebu City',
        pdEmergencyName: 'Bote Sibling',
        pdEmergencyPhone: '09172223344',
        pdEmergencyRelationship: 'Sibling',
        documents: ['/uploads/applications/user5-id.jpg'],
        status: 'under_review',
      },
      {
        id: appUser2StandaloneId,
        userId: user2,
        propertyId: property1Id,
        unitId: unitsP1[0],
        pdFullName: 'Cardo Dalisay',
        pdPhone: '09993334444',
        pdOccupation: 'Designer',
        pdSchool: null,
        pdAddress: '456 Old St., Cebu City',
        pdEmergencyName: 'Emergency Contact 2',
        pdEmergencyPhone: '09111111111',
        pdEmergencyRelationship: 'Parent',
        documents: ['/uploads/applications/user2-id.jpg'],
        status: 'approved',
        reviewedBy: landlord2,
        reviewNotes: 'Documents verified, approved for move-in.',
        reviewedAt: new Date('2026-02-10T00:00:00Z'),
      },
      {
        id: appUser6Id,
        userId: user6,
        propertyId: property0Id,
        unitId: unitsP0[2],
        pdFullName: 'Ding Dantes',
        pdPhone: '09881112222',
        pdOccupation: 'Freelancer',
        pdSchool: null,
        pdAddress: '78 Banilad St., Cebu City',
        pdEmergencyName: 'Dantes Parent',
        pdEmergencyPhone: '09173334455',
        pdEmergencyRelationship: 'Parent',
        documents: [],
        status: 'rejected',
        reviewedBy: landlord1,
        reviewNotes: 'Insufficient proof of income.',
        reviewedAt: new Date('2026-02-12T00:00:00Z'),
      },
      {
        id: appUser1Id,
        userId: user1,
        propertyId: property0Id,
        unitId: unit1Id,
        pdFullName: 'Luzviminda Macaraeg',
        pdPhone: '09991112222',
        pdOccupation: 'Software Engineer',
        pdSchool: null,
        pdAddress: '123 Test St., Cebu City',
        pdEmergencyName: 'Emergency Contact 1',
        pdEmergencyPhone: '09000000000',
        pdEmergencyRelationship: 'Sibling',
        documents: ['/uploads/applications/user1-id.jpg'],
        status: 'approved',
        reviewedBy: landlord1,
        reviewNotes: 'Approved for move-in.',
        reviewedAt: new Date('2025-12-20T00:00:00Z'),
      },
      {
        id: appUser2ContractId,
        userId: user2,
        propertyId: property0Id,
        unitId: unit1Id,
        pdFullName: 'Cardo Dalisay',
        pdPhone: '09993334444',
        pdOccupation: 'Designer',
        pdSchool: null,
        pdAddress: '456 Old St., Cebu City',
        pdEmergencyName: 'Emergency Contact 2',
        pdEmergencyPhone: '09111111111',
        pdEmergencyRelationship: 'Parent',
        documents: ['/uploads/applications/user2-past-id.jpg'],
        status: 'approved',
        reviewedBy: landlord1,
        reviewNotes: 'Approved for move-in.',
        reviewedAt: new Date('2024-03-01T00:00:00Z'),
      },
      {
        id: appUser3Id,
        userId: user3,
        propertyId: property0Id,
        unitId: unit1Id,
        pdFullName: 'Nena Reyes',
        pdPhone: '09995556666',
        pdOccupation: 'Nurse',
        pdSchool: null,
        pdAddress: '789 New St., Cebu City',
        pdEmergencyName: 'Reyes Sibling',
        pdEmergencyPhone: '09000000002',
        pdEmergencyRelationship: 'Sibling',
        documents: ['/uploads/applications/user3-id.jpg'],
        status: 'approved',
        reviewedBy: landlord1,
        reviewNotes: 'Approved for move-in.',
        reviewedAt: new Date('2025-05-01T00:00:00Z'),
      },
    ],
  });
  console.log('Seeded 7 rental applications.');

  // ===========================================================================
  // 8. Contracts (source: seed.ts seedContractsAndTenancies()). tenancy_id
  //    starts null; contract1 and pastContract get backfilled once their
  //    tenancies exist below. expiringContract's tenancy_id stays null forever
  //    -- user3 never checks in in the Mongo fixture.
  // ===========================================================================
  console.log('Seeding contracts...');
  const contract1Id = randomUUID();
  const pastContractId = randomUUID();
  const expiringContractId = randomUUID();

  await prisma.contract.createMany({
    data: [
      {
        id: contract1Id,
        applicationId: appUser1Id,
        tenancyId: null,
        landlordId: landlord1,
        userId: user1,
        propertyId: property0Id,
        unitId: unit1Id,
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
        signedAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: pastContractId,
        applicationId: appUser2ContractId,
        tenancyId: null,
        landlordId: landlord1,
        userId: user2,
        propertyId: property0Id,
        unitId: unit1Id,
        rateType: 'fixed',
        startDate: new Date('2024-03-15T00:00:00Z'),
        endDate: new Date('2025-03-15T00:00:00Z'),
        lockInPeriod: 6,
        monthlyRent: 8000,
        securityDeposit: 8000,
        advancePayment: 8000,
        status: 'expired',
        landlordSignature: 'mock-signature-base64',
        userSignature: 'mock-signature-base64',
        signedAt: new Date('2024-03-15T00:00:00Z'),
      },
      {
        id: expiringContractId,
        applicationId: appUser3Id,
        tenancyId: null,
        landlordId: landlord1,
        userId: user3,
        propertyId: property0Id,
        unitId: unit1Id,
        rateType: 'fixed',
        startDate: new Date('2025-05-15T00:00:00Z'),
        endDate: new Date('2026-05-15T00:00:00Z'),
        lockInPeriod: 6,
        monthlyRent: 9000,
        securityDeposit: 9000,
        advancePayment: 9000,
        status: 'active',
        landlordSignature: 'mock-signature-base64',
        userSignature: 'mock-signature-base64',
        signedAt: new Date('2025-05-15T00:00:00Z'),
      },
    ],
  });
  console.log('Seeded 3 contracts.');

  // ===========================================================================
  // 9. Tenancies + tenancy_comments, then backfill contracts.tenancy_id.
  // ===========================================================================
  console.log('Seeding tenancies & tenancy comments...');
  const tenancy1Id = randomUUID();
  const tenancy2Id = randomUUID();

  await prisma.$transaction([
    prisma.tenancy.createMany({
      data: [
        {
          id: tenancy1Id,
          userId: user1,
          propertyId: property0Id,
          unitId: unit1Id,
          contractId: contract1Id,
          status: 'checked_in',
          checkInDate: new Date('2026-01-02T00:00:00Z'),
          checkOutDate: null,
          slotNumber: null,
          isPrimary: true,
          householdMembers: undefined,
          pdFullName: 'Luzviminda Macaraeg',
          pdPhone: '09991112222',
          pdOccupation: 'Software Engineer',
          pdSchool: null,
          pdAddress: '123 Test St.',
          pdEmergencyName: 'Emergency Contact 1',
          pdEmergencyPhone: '09000000000',
          pdEmergencyRelationship: 'Sibling',
        },
        {
          id: tenancy2Id,
          userId: user2,
          propertyId: property0Id,
          unitId: unit1Id,
          contractId: pastContractId,
          status: 'checked_out',
          checkInDate: new Date('2024-03-15T00:00:00Z'),
          checkOutDate: new Date('2025-03-15T00:00:00Z'),
          slotNumber: null,
          isPrimary: true,
          householdMembers: undefined,
          pdFullName: 'Cardo Dalisay',
          pdPhone: '09993334444',
          pdOccupation: 'Designer',
          pdSchool: null,
          pdAddress: '456 Old St.',
          pdEmergencyName: 'Emergency Contact 2',
          pdEmergencyPhone: '09111111111',
          pdEmergencyRelationship: 'Parent',
        },
      ],
    }),
    prisma.tenancyComment.createMany({
      data: [
        { id: randomUUID(), tenancyId: tenancy1Id, userId: landlord1, role: 'caretaker', text: 'Tenant checked in successfully. Gave keys.', createdAt: new Date('2026-01-02T09:00:00Z') },
        { id: randomUUID(), tenancyId: tenancy1Id, userId: user1, role: 'tenant', text: 'Moved in, the room is clean. Thank you!', createdAt: new Date('2026-01-02T18:00:00Z') },
        { id: randomUUID(), tenancyId: tenancy2Id, userId: landlord1, role: 'caretaker', text: 'Tenant checked out successfully. Unit left in good condition.', createdAt: new Date('2025-03-15T00:00:00Z') },
      ],
    }),
    prisma.contract.update({ where: { id: contract1Id }, data: { tenancyId: tenancy1Id } }),
    prisma.contract.update({ where: { id: pastContractId }, data: { tenancyId: tenancy2Id } }),
  ]);
  console.log('Seeded 2 tenancies, 3 tenancy comments, backfilled 2 contracts.tenancy_id.');

  // ===========================================================================
  // 10. Bills (source: seed.ts seedContractsAndTenancies() utility bill loop).
  //     Arithmetic mirrors seed.ts exactly (elecExtra/waterExtra fixed arrays
  //     replace its Math.random() calls). seed.ts's period boundaries come
  //     from local-timezone `new Date(y, m, d)` construction, which is
  //     inherently machine-dependent; this seed instead fixes them as UTC
  //     literals (see report "Judgment calls") so the values are reproducible
  //     regardless of the host running this script.
  // ===========================================================================
  console.log('Seeding bills...');

  const elecRate = 12.5;
  const waterRate = 45;
  const internetAmount = 1500;

  // m=0: newest month (Mar 2026) -- left unpaid
  const m0ElecPrev = 1500, m0ElecCurr = 1500 + 120 + 10, m0ElecCons = m0ElecCurr - m0ElecPrev, m0ElecAmount = m0ElecCons * elecRate;
  const m0WaterPrev = 100, m0WaterCurr = 100 + 15 + 2, m0WaterCons = m0WaterCurr - m0WaterPrev, m0WaterAmount = m0WaterCons * waterRate;
  const m0Total = m0ElecAmount + m0WaterAmount + internetAmount;
  const m0PerHead = m0Total / 2;

  // m=1: middle month (Feb 2026) -- partially paid
  const m1ElecPrev = 1500 + 120, m1ElecCurr = m1ElecPrev + 120 + 5, m1ElecCons = m1ElecCurr - m1ElecPrev, m1ElecAmount = m1ElecCons * elecRate;
  const m1WaterPrev = 100 + 15, m1WaterCurr = m1WaterPrev + 15 + 4, m1WaterCons = m1WaterCurr - m1WaterPrev, m1WaterAmount = m1WaterCons * waterRate;
  const m1Total = m1ElecAmount + m1WaterAmount + internetAmount;
  const m1PerHead = m1Total / 2;

  // m=2: oldest month (Jan 2026) -- fully paid
  const m2ElecPrev = 1500 + 240, m2ElecCurr = m2ElecPrev + 120 + 20, m2ElecCons = m2ElecCurr - m2ElecPrev, m2ElecAmount = m2ElecCons * elecRate;
  const m2WaterPrev = 100 + 30, m2WaterCurr = m2WaterPrev + 15 + 1, m2WaterCons = m2WaterCurr - m2WaterPrev, m2WaterAmount = m2WaterCons * waterRate;
  const m2Total = m2ElecAmount + m2WaterAmount + internetAmount;
  const m2PerHead = m2Total / 2;

  const note = (total: number, perHead: number) =>
    `Shared utility: total ₱${total.toLocaleString()} divided by 2 occupant(s) = ₱${perHead.toLocaleString()} per occupant`;

  const unpaidBillId = randomUUID(); // m=0
  const partialBillId = randomUUID(); // m=1
  const paidBillId = randomUUID(); // m=2

  await prisma.bill.createMany({
    data: [
      {
        id: unpaidBillId,
        tenancyId: tenancy1Id,
        propertyId: property0Id,
        unitId: unit1Id,
        contractId: contract1Id,
        type: 'utility',
        billingPeriodStart: new Date('2026-03-01T00:00:00Z'),
        billingPeriodEnd: new Date('2026-03-31T00:00:00Z'),
        rentAmount: 0,
        utilityAmount: m0PerHead,
        penaltyAmount: 0,
        totalAmount: m0PerHead,
        paidAmount: 0,
        balanceAmount: m0PerHead,
        status: 'unpaid',
        dueDate: new Date('2026-04-05T00:00:00Z'),
        utilityBreakdown: {
          electricity: { previousReading: m0ElecPrev, currentReading: m0ElecCurr, consumption: m0ElecCons, rate: elecRate, amount: m0ElecAmount },
          water: { previousReading: m0WaterPrev, currentReading: m0WaterCurr, consumption: m0WaterCons, rate: waterRate, amount: m0WaterAmount },
          internet: { amount: internetAmount },
        },
        notes: note(m0Total, m0PerHead),
        isAutoGenerated: false,
      },
      {
        id: partialBillId,
        tenancyId: tenancy1Id,
        propertyId: property0Id,
        unitId: unit1Id,
        contractId: contract1Id,
        type: 'utility',
        billingPeriodStart: new Date('2026-02-01T00:00:00Z'),
        billingPeriodEnd: new Date('2026-02-28T00:00:00Z'),
        rentAmount: 0,
        utilityAmount: m1PerHead,
        penaltyAmount: 0,
        totalAmount: m1PerHead,
        paidAmount: 0,
        balanceAmount: m1PerHead,
        status: 'unpaid',
        dueDate: new Date('2026-03-05T00:00:00Z'),
        utilityBreakdown: {
          electricity: { previousReading: m1ElecPrev, currentReading: m1ElecCurr, consumption: m1ElecCons, rate: elecRate, amount: m1ElecAmount },
          water: { previousReading: m1WaterPrev, currentReading: m1WaterCurr, consumption: m1WaterCons, rate: waterRate, amount: m1WaterAmount },
          internet: { amount: internetAmount },
        },
        notes: note(m1Total, m1PerHead),
        isAutoGenerated: false,
      },
      {
        id: paidBillId,
        tenancyId: tenancy1Id,
        propertyId: property0Id,
        unitId: unit1Id,
        contractId: contract1Id,
        type: 'utility',
        billingPeriodStart: new Date('2026-01-01T00:00:00Z'),
        billingPeriodEnd: new Date('2026-01-31T00:00:00Z'),
        rentAmount: 0,
        utilityAmount: m2PerHead,
        penaltyAmount: 0,
        totalAmount: m2PerHead,
        paidAmount: 0,
        balanceAmount: m2PerHead,
        status: 'unpaid',
        dueDate: new Date('2026-02-05T00:00:00Z'),
        utilityBreakdown: {
          electricity: { previousReading: m2ElecPrev, currentReading: m2ElecCurr, consumption: m2ElecCons, rate: elecRate, amount: m2ElecAmount },
          water: { previousReading: m2WaterPrev, currentReading: m2WaterCurr, consumption: m2WaterCons, rate: waterRate, amount: m2WaterAmount },
          internet: { amount: internetAmount },
        },
        notes: note(m2Total, m2PerHead),
        isAutoGenerated: false,
      },
    ],
  });
  console.log('Seeded 3 bills.');

  // ===========================================================================
  // 11. Payments (source: seed.ts seedPayments()), then reconcile paidBill and
  //     partialBill's paid_amount/balance_amount/status against the payment
  //     sums. unpaidBill is left at its seeded unpaid/zero-paid defaults.
  // ===========================================================================
  console.log('Seeding payments...');
  await prisma.$transaction([
    prisma.payment.createMany({
      data: [
        { id: randomUUID(), billId: paidBillId, tenancyId: tenancy1Id, amount: 1000, paymentDate: new Date('2026-02-01T10:00:00Z'), method: 'cash', recordedByUserId: staff3 },
        { id: randomUUID(), billId: paidBillId, tenancyId: tenancy1Id, amount: 985, paymentDate: new Date('2026-02-03T15:30:00Z'), method: 'gcash', referenceNumber: 'GC-2026-0001', recordedByUserId: staff3 },
        { id: randomUUID(), billId: partialBillId, tenancyId: tenancy1Id, amount: 900, paymentDate: new Date('2026-03-01T09:00:00Z'), method: 'bank_transfer', referenceNumber: 'BT-2026-0002', recordedByUserId: staff3 },
        { id: randomUUID(), billId: partialBillId, tenancyId: tenancy1Id, amount: 500, paymentDate: new Date('2026-03-02T14:00:00Z'), method: 'other', notes: 'Partial payment via money remittance center.', recordedByUserId: staff3 },
      ],
    }),
    prisma.bill.update({ where: { id: paidBillId }, data: { paidAmount: 1985, balanceAmount: m2PerHead - 1985, status: 'paid' } }),
    prisma.bill.update({ where: { id: partialBillId }, data: { paidAmount: 1400, balanceAmount: m1PerHead - 1400, status: 'partial' } }),
  ]);
  console.log('Seeded 4 payments; reconciled paidBill and partialBill.');

  // ===========================================================================
  // 12. Inventory + inventory_records (source: seed.ts seedInventory()).
  //     Final available_quantity/status bake in both the initial create value
  //     and the subsequent $inc from issuing (5->4 seeded, then -1 issued -> 3;
  //     10->8 seeded, then -2 issued -> 6).
  // ===========================================================================
  console.log('Seeding inventory & inventory records...');
  const inventoryAcId = randomUUID();
  const inventoryChairId = randomUUID();
  const inventoryMicrowaveId = randomUUID();

  await prisma.inventory.createMany({
    data: [
      { id: inventoryAcId, propertyId: property0Id, itemName: 'Samsung Split-type AC 1HP', serialNumber: 'SMC-9921-AC', condition: 'good', quantity: 5, availableQuantity: 3, status: 'issued', purchaseDate: new Date('2023-01-15T00:00:00Z'), purchaseCost: 25000 },
      { id: inventoryChairId, propertyId: property0Id, itemName: 'Office Desk Chair (Ergo)', serialNumber: null, condition: 'new', quantity: 10, availableQuantity: 6, status: 'issued', purchaseDate: new Date('2025-11-10T00:00:00Z'), purchaseCost: 3500 },
      { id: inventoryMicrowaveId, propertyId: property0Id, itemName: 'Microwave Oven (LG)', serialNumber: 'LG-MW-005', condition: 'damaged', quantity: 2, availableQuantity: 2, status: 'maintenance', purchaseDate: new Date('2022-05-20T00:00:00Z'), purchaseCost: 4500 },
    ],
  });

  await prisma.inventoryRecord.createMany({
    data: [
      { id: randomUUID(), inventoryItemId: inventoryAcId, tenancyId: tenancy1Id, propertyId: property0Id, unitId: unit1Id, issuedByUserId: staff1, issuedDate: new Date('2026-03-20T00:00:00Z'), quantityIssued: 1, issuedCondition: 'good', status: 'active' },
      { id: randomUUID(), inventoryItemId: inventoryChairId, tenancyId: tenancy1Id, propertyId: property0Id, unitId: unit1Id, issuedByUserId: staff1, issuedDate: new Date('2026-03-20T00:00:00Z'), quantityIssued: 2, issuedCondition: 'new', status: 'active' },
    ],
  });
  console.log('Seeded 3 inventory items, 2 inventory records.');

  // ===========================================================================
  // 13. Notifications (source: seed.ts seedNotifications()).
  // ===========================================================================
  console.log('Seeding notifications...');
  await prisma.notification.createMany({
    data: [
      { id: randomUUID(), userId: landlord1, type: 'inquiry', title: 'New Inquiry Received', message: 'You have a new inquiry for unit 101.', isRead: false },
      { id: randomUUID(), userId: landlord1, type: 'contract', title: 'Contract Expiring Soon', message: 'A contract for user3 is expiring in 2 months.', isRead: false },
    ],
  });
  console.log('Seeded 2 notifications.');

  // ===========================================================================
  // 14. Visit requests (source: seed.ts seedVisitRequests()).
  // ===========================================================================
  console.log('Seeding visit requests...');
  await prisma.visitRequest.createMany({
    data: [
      { id: randomUUID(), userId: user1, propertyId: property0Id, unitId: unitsP0[0], requestedDate: new Date('2026-02-01T00:00:00Z'), requestedTime: '10:00', purpose: 'viewing', status: 'pending' },
      { id: randomUUID(), userId: user2, propertyId: property0Id, unitId: unitsP0[1], requestedDate: new Date('2026-02-03T00:00:00Z'), requestedTime: '11:00', purpose: 'viewing', status: 'approved' },
      { id: randomUUID(), userId: user3, propertyId: property1Id, unitId: unitsP1[0], requestedDate: new Date('2026-02-05T00:00:00Z'), requestedTime: '14:00', scheduledDate: new Date('2026-02-06T00:00:00Z'), scheduledTime: '14:00', purpose: 'inspection', status: 'scheduled', assignedStaffId: staff2 },
      { id: randomUUID(), userId: user4, propertyId: property0Id, unitId: unitsP0[0], requestedDate: new Date('2026-01-20T00:00:00Z'), requestedTime: '09:00', scheduledDate: new Date('2026-01-21T00:00:00Z'), scheduledTime: '09:00', purpose: 'viewing', status: 'completed', assignedStaffId: staff4 },
      { id: randomUUID(), userId: user5, propertyId: property1Id, unitId: unitsP1[1], requestedDate: new Date('2026-01-25T00:00:00Z'), requestedTime: '13:00', purpose: 'viewing', status: 'cancelled', notes: 'Requester cancelled due to a schedule conflict.' },
    ],
  });
  console.log('Seeded 5 visit requests.');

  // ===========================================================================
  // 15. Transfer requests (source: seed.ts seedTransferRequests()).
  // ===========================================================================
  console.log('Seeding transfer requests...');
  await prisma.transferRequest.createMany({
    data: [
      { id: randomUUID(), tenancyId: tenancy1Id, propertyId: property0Id, fromUnitId: unitsP0[0], toUnitId: unitsP0[1], reason: 'Tenant requested a move to a smaller room to reduce rent.', initiatedByUserId: user1, status: 'pending' },
      { id: randomUUID(), tenancyId: tenancy1Id, propertyId: property0Id, fromUnitId: unitsP0[0], toUnitId: unitsP0[2], reason: 'Requested move due to noise complaints from a neighboring room.', initiatedByUserId: user1, status: 'approved', reviewedBy: staff1, reviewNotes: 'Approved, unit is available.', reviewedAt: new Date('2026-02-20T00:00:00Z') },
      { id: randomUUID(), tenancyId: tenancy1Id, propertyId: property0Id, fromUnitId: unitsP0[1], toUnitId: unitsP0[2], reason: 'Downsizing after roommate moved out.', initiatedByUserId: staff1, status: 'completed', reviewedBy: landlord1, reviewNotes: 'Transfer completed successfully.', reviewedAt: new Date('2026-02-25T00:00:00Z'), completedAt: new Date('2026-02-27T00:00:00Z') },
    ],
  });
  console.log('Seeded 3 transfer requests.');

  // ===========================================================================
  // 16. Inquiries + conversations + conversation_participants + messages +
  //     message_reads (source: seed.ts seedInquiriesConversationsAndMessages()).
  //     seed.ts leaves message timestamps to Mongoose's implicit sequential
  //     `timestamps: true`; this seed assigns explicit, increasing UTC
  //     literals per conversation instead so createMany's ordering doesn't
  //     depend on Postgres's default-clock resolution (see report).
  // ===========================================================================
  console.log('Seeding inquiries, conversations & messages...');
  const inquiry1Id = randomUUID();
  const inquiry2Id = randomUUID();
  const inquiry3Id = randomUUID();
  const conversation1Id = randomUUID();
  const conversation2Id = randomUUID();
  const conversation3Id = randomUUID();

  await prisma.inquiry.createMany({
    data: [
      { id: inquiry1Id, userId: user4, propertyId: property0Id, unitId: unitsP0[0], subject: 'Is WiFi included?', status: 'open' },
      { id: inquiry2Id, userId: user5, propertyId: property1Id, unitId: unitsP1[0], subject: 'Can I view the room this weekend?', status: 'in_progress' },
      { id: inquiry3Id, userId: user6, propertyId: property0Id, unitId: unitsP0[2], subject: 'Inquiry about deposit refund policy', status: 'closed' },
    ],
  });

  await prisma.conversation.createMany({
    data: [
      { id: conversation1Id, inquiryId: inquiry1Id },
      { id: conversation2Id, inquiryId: inquiry2Id },
      { id: conversation3Id, inquiryId: inquiry3Id },
    ],
  });

  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conversation1Id, userId: user4 },
      { conversationId: conversation1Id, userId: landlord1 },
      { conversationId: conversation2Id, userId: user5 },
      { conversationId: conversation2Id, userId: landlord2 },
      { conversationId: conversation3Id, userId: user6 },
      { conversationId: conversation3Id, userId: landlord1 },
    ],
  });

  const msg1Id = randomUUID();
  const msg2Id = randomUUID();
  const msg3Id = randomUUID();
  const msg4Id = randomUUID();
  const msg5Id = randomUUID();
  const msg6Id = randomUUID();
  const msg7Id = randomUUID();
  const msg8Id = randomUUID();
  const msg9Id = randomUUID();

  await prisma.message.createMany({
    data: [
      { id: msg1Id, conversationId: conversation1Id, senderId: user4, content: 'Hi, is WiFi included in the rent?', attachments: [], createdAt: new Date('2026-02-01T09:00:00Z') },
      { id: msg2Id, conversationId: conversation1Id, senderId: landlord1, content: 'Yes, WiFi is included in the rent.', attachments: [], createdAt: new Date('2026-02-01T09:05:00Z') },
      { id: msg3Id, conversationId: conversation2Id, senderId: user5, content: 'Can I view the room this weekend?', attachments: [], createdAt: new Date('2026-02-03T10:00:00Z') },
      { id: msg4Id, conversationId: conversation2Id, senderId: landlord2, content: 'Sure, Saturday 2pm works.', attachments: [], createdAt: new Date('2026-02-03T10:05:00Z') },
      { id: msg5Id, conversationId: conversation2Id, senderId: user5, content: 'Great, see you then!', attachments: [], createdAt: new Date('2026-02-03T10:10:00Z') },
      { id: msg6Id, conversationId: conversation3Id, senderId: user6, content: 'What is the deposit refund policy?', attachments: [], createdAt: new Date('2026-02-05T11:00:00Z') },
      { id: msg7Id, conversationId: conversation3Id, senderId: landlord1, content: 'Deposit is refunded within 30 days of check-out, less deductions.', attachments: [], createdAt: new Date('2026-02-05T11:05:00Z') },
      { id: msg8Id, conversationId: conversation3Id, senderId: user6, content: 'Understood, thank you!', attachments: [], createdAt: new Date('2026-02-05T11:10:00Z') },
      { id: msg9Id, conversationId: conversation3Id, senderId: landlord1, content: 'You are welcome. Closing this inquiry.', attachments: [], createdAt: new Date('2026-02-05T11:15:00Z') },
    ],
  });

  await prisma.messageRead.createMany({
    data: [
      { messageId: msg1Id, userId: landlord1 },
      { messageId: msg3Id, userId: landlord2 },
      { messageId: msg4Id, userId: user5 },
      { messageId: msg6Id, userId: landlord1 },
      { messageId: msg7Id, userId: user6 },
      { messageId: msg8Id, userId: landlord1 },
      { messageId: msg9Id, userId: user6 },
    ],
  });
  console.log('Seeded 3 inquiries, 3 conversations, 6 conversation participants, 9 messages, 7 message reads.');

  // ===========================================================================
  // 17. Tickets + ticket_updates (source: seed.ts seedTickets()).
  // ===========================================================================
  console.log('Seeding tickets...');
  const ticket1Id = randomUUID();
  const ticket2Id = randomUUID();
  const ticket3Id = randomUUID();
  const ticket4Id = randomUUID();
  const ticket5Id = randomUUID();

  await prisma.ticket.createMany({
    data: [
      { id: ticket1Id, tenancyId: tenancy1Id, propertyId: property0Id, unitId: unit1Id, reportedByUserId: user1, title: 'Leaking faucet in bathroom', description: 'The bathroom faucet has been dripping continuously since yesterday.', category: 'plumbing', priority: 'medium', images: [], status: 'open' },
      { id: ticket2Id, tenancyId: tenancy1Id, propertyId: property0Id, unitId: unit1Id, reportedByUserId: user1, title: 'Aircon not cooling', description: 'The split-type aircon runs but no longer cools the room.', category: 'appliance', priority: 'high', images: [], status: 'assigned', assignedToUserId: staff2, assignedByUserId: staff1 },
      { id: ticket3Id, tenancyId: tenancy1Id, propertyId: property0Id, unitId: unit1Id, reportedByUserId: user1, title: 'Flickering lights in room', description: 'Ceiling light flickers intermittently, possibly a wiring issue.', category: 'electrical', priority: 'urgent', images: [], status: 'in_progress', assignedToUserId: staff2, assignedByUserId: staff1 },
      { id: ticket4Id, tenancyId: tenancy2Id, propertyId: property0Id, unitId: unit1Id, reportedByUserId: user2, title: 'Pest sighting in room corner', description: 'Cockroaches spotted near the corner cabinet.', category: 'pest', priority: 'low', images: [], status: 'resolved', assignedToUserId: staff2, assignedByUserId: staff1, resolutionNotes: 'Pest control treated the area; no further sightings reported.', resolvedAt: new Date('2024-11-10T00:00:00Z') },
      { id: ticket5Id, tenancyId: tenancy2Id, propertyId: property0Id, unitId: unit1Id, reportedByUserId: user2, title: 'Broken window latch', description: 'Window latch is broken and the window does not close properly.', category: 'structural', priority: 'medium', images: [], status: 'closed', assignedToUserId: staff2, assignedByUserId: staff1, resolutionNotes: 'Latch replaced and verified working.', resolvedAt: new Date('2024-12-01T00:00:00Z') },
    ],
  });

  await prisma.ticketUpdate.createMany({
    data: [
      { id: randomUUID(), ticketId: ticket2Id, userId: staff1, message: 'Assigned to Jose Rizal for inspection.', timestamp: new Date('2026-03-16T09:00:00Z') },
      { id: randomUUID(), ticketId: ticket3Id, userId: staff2, message: 'On-site, checking the wiring.', timestamp: new Date('2026-03-17T10:00:00Z') },
      { id: randomUUID(), ticketId: ticket3Id, userId: user1, message: 'Thanks, waiting for the update.', timestamp: new Date('2026-03-17T12:00:00Z') },
      { id: randomUUID(), ticketId: ticket4Id, userId: staff2, message: 'Pest control scheduled for treatment.', timestamp: new Date('2024-11-05T09:00:00Z') },
    ],
  });
  console.log('Seeded 5 tickets, 4 ticket updates.');

  // ===========================================================================
  // 18. Landlord applications, documents, incident reports (source: seed.ts
  //     seedLandlordApplicationsDocumentsAndIncidents()).
  // ===========================================================================
  console.log('Seeding landlord applications, documents & incident reports...');
  await prisma.landlordApplication.createMany({
    data: [
      { id: randomUUID(), userId: user6, businessName: 'Dantes Rental Ventures', businessType: 'Sole Proprietorship', documents: ['/uploads/landlord-applications/user6-permit.pdf'], status: 'pending' },
      { id: randomUUID(), userId: user3, businessName: 'Macaraeg Properties', businessType: 'Sole Proprietorship', documents: ['/uploads/landlord-applications/user3-permit.pdf'], status: 'approved', reviewedBy: admin, reviewedAt: new Date('2026-02-15T00:00:00Z'), reviewNotes: 'Documents verified, business permit valid.' },
    ],
  });

  await prisma.document.createMany({
    data: [
      { id: randomUUID(), propertyId: property0Id, unitId: unit1Id, tenancyId: tenancy1Id, type: 'contract', title: 'Signed Lease Contract - User1', fileUrl: '/uploads/documents/contract-user1.pdf', uploadedBy: staff3 },
      { id: randomUUID(), propertyId: property0Id, unitId: unit1Id, tenancyId: tenancy2Id, type: 'receipt', title: 'Final Move-out Receipt - User2', fileUrl: '/uploads/documents/receipt-user2.pdf', uploadedBy: staff3 },
    ],
  });

  await prisma.incidentReport.createMany({
    data: [
      { id: randomUUID(), propertyId: property0Id, reportedBy: staff2, dateOfIncident: new Date('2026-02-18T00:00:00Z'), type: 'damage', severity: 'medium', description: 'Water damage found in the common area ceiling after heavy rain.', status: 'investigating', attachments: [] },
      { id: randomUUID(), propertyId: property0Id, reportedBy: staff2, dateOfIncident: new Date('2026-01-05T00:00:00Z'), type: 'dispute', severity: 'low', description: 'Minor dispute between tenants over shared kitchen usage.', status: 'resolved', resolutionNotes: 'Mediated by staff; both parties agreed on a cleaning schedule.', attachments: [] },
    ],
  });
  console.log('Seeded 2 landlord applications, 2 documents, 2 incident reports.');

  console.log('Postgres seeded successfully.');
}

run()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Seeding Failed: ${(error as Error).message}`);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
