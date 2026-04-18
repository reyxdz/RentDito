import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { hash } from '../utils/password';

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
  // await Lease.deleteMany();
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

  const user1 = await User.create({ name: 'Luzviminda Macaraeg', email: 'user1@rentdito.com', phone: '09991112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user2 = await User.create({ name: 'Cardo Dalisay', email: 'user2@rentdito.com', phone: '09993334444', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user3 = await User.create({ name: 'Nena Reyes', email: 'user3@rentdito.com', phone: '09995556666', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user4 = await User.create({ name: 'Boyet Fernandez', email: 'user4@rentdito.com', phone: '09997778888', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });
  const user5 = await User.create({ name: 'Inday Bote', email: 'user5@rentdito.com', phone: '09999990000', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });
  const user6 = await User.create({ name: 'Ding Dantes', email: 'user6@rentdito.com', phone: '09881112222', passwordHash: defaultPassword, role: 'user', verificationStatus: 'pending' });

  return [superAdmin, landlord1, landlord2, staff1, staff2, staff3, staff4, user1, user2, user3, user4, user5, user6];
};

const seedProperties = async (users: any[]) => {
  console.log('Seeding properties...');

  const landlord1 = users.find(u => u.email === 'landlord1@rentdito.com');
  const landlord2 = users.find(u => u.email === 'landlord2@rentdito.com');

  const p1 = await Property.create({
    landlordId: landlord1._id,
    name: "Sunshine Apartments",
    description: "Modern apartment complex near the university.",
    address: { street: "123 Main St", city: "Cebu City", province: "Cebu", zipCode: "6000", country: "Philippines" },
    propertyType: "Apartment",
    status: "Active",
    amenities: ["WiFi", "Guard"],
    inclusions: ["Water", "Garbage"],
    venues: { reviewCenters: [], schools: [{ name: "USC", distance: "5 min" }], commercial: [] },
    billingSettings: { billingDay: 1, dueDay: 5, lateFeePercent: 5, utilityDefault: "metered" },
    emergencyContacts: []
  });

  const p2 = await Property.create({
    landlordId: landlord2._id,
    name: "Blue Boarding House",
    description: "Cozy boarding house with shared and private spaces.",
    address: { street: "456 Side St", city: "Cebu City", province: "Cebu", zipCode: "6000", country: "Philippines" },
    propertyType: "Boarding House",
    status: "Active",
    amenities: ["CCTV"],
    inclusions: ["WiFi"],
    venues: { reviewCenters: [], schools: [], commercial: [] },
    billingSettings: { billingDay: 1, dueDay: 5, lateFeePercent: 5, utilityDefault: "included" },
    emergencyContacts: []
  });

  const p3 = await Property.create({
    landlordId: landlord2._id,
    name: "Green Residences",
    description: "High-end residential complex.",
    address: { street: "789 High Ave", city: "Mandaue City", province: "Cebu", zipCode: "6014", country: "Philippines" },
    propertyType: "Mixed Use",
    status: "Active",
    amenities: ["Pool", "Gym"],
    inclusions: [],
    venues: { reviewCenters: [], schools: [], commercial: [] },
    billingSettings: { billingDay: 5, dueDay: 10, lateFeePercent: 10, utilityDefault: "metered" },
    emergencyContacts: []
  });

  return [p1, p2, p3]; // Return created properties
};

const seedUnits = async (properties: any[]) => {
  console.log('Seeding units...');
  const [p1, p2, p3] = properties;

  // Property 1: 5 Room units
  for (let i = 1; i <= 5; i++) {
    await Unit.create({
      propertyId: p1._id,
      unitIdentifier: `Unit 10${i}`,
      accommodationType: 'room',
      roomRent: 15000 + (i * 1000),
      deposit: 30000,
      capacity: 2,
      maxOccupants: 3,
      sizeSqm: 25,
      features: ['Balcony', 'AC'],
      status: i === 1 ? 'occupied' : 'vacant',
    });
  }

  // Property 2: Mixed (2 rooms, 3 bedspaces)
  for (let i = 1; i <= 2; i++) {
    await Unit.create({
      propertyId: p2._id,
      unitIdentifier: `Room A${i}`,
      accommodationType: 'room',
      roomRent: 10000,
      deposit: 10000,
      capacity: 1,
      maxOccupants: 2,
      sizeSqm: 15,
      features: ['Ceiling Fan'],
      status: 'vacant',
    });
  }
  for (let i = 1; i <= 3; i++) {
    const slots = [];
    for (let s = 1; s <= 4; s++) {
      slots.push({ slotNumber: s, status: s === 1 ? 'occupied' : 'vacant' });
    }
    await Unit.create({
      propertyId: p2._id,
      unitIdentifier: `Bedspace B${i}`,
      accommodationType: 'bedspace',
      bedspaceRent: 2500,
      deposit: 2500,
      capacity: 4,
      maxOccupants: 4,
      sizeSqm: 20,
      features: ['Bunk Beds', 'Lockers'],
      status: i === 1 ? 'occupied' : 'vacant',
      slots
    });
  }

  // Property 3: 4 Bedspace units
  for (let i = 1; i <= 4; i++) {
    const slots = [];
    for (let s = 1; s <= 6; s++) {
      slots.push({ slotNumber: s, status: 'vacant' });
    }
    await Unit.create({
      propertyId: p3._id,
      unitIdentifier: `Suite C${i}`,
      accommodationType: 'bedspace',
      bedspaceRent: 4000,
      deposit: 4000,
      capacity: 6,
      maxOccupants: 6,
      sizeSqm: 35,
      features: ['AC', 'Premium Beds'],
      status: 'vacant',
      slots
    });
  }
};

const seedLeases = async (users: any[], properties: any[]) => {
  console.log('Seeding leases...');
  // Placeholder logic
  return []; // Return created leases
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
    const leases = await seedLeases(users, properties);
    await seedPayments(leases);
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
