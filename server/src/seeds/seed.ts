import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';
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
  // await Property.deleteMany();
  // await Lease.deleteMany();
  console.log('Database cleared!');
};

const seedUsers = async () => {
  console.log('Seeding users...');
  const defaultPassword = await hash('password123');
  
  const superAdmin = await User.create({ name: 'Super Admin', email: 'admin@rentdito.com', passwordHash: defaultPassword, role: 'super_admin', verificationStatus: 'verified' });
  
  const landlord1 = await User.create({ name: 'Primary Landlord', email: 'landlord@rentdito.com', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified' });
  const landlord2 = await User.create({ name: 'Secondary Landlord', email: 'landlord2@rentdito.com', passwordHash: defaultPassword, role: 'landlord', verificationStatus: 'verified' });
  
  const staff1 = await User.create({ name: 'Manager Staff', email: 'staff1@rentdito.com', passwordHash: defaultPassword, role: 'staff', positionName: 'Manager', permissions: ['manage_properties', 'manage_leases'], verificationStatus: 'verified', landlordId: landlord1._id });
  const staff2 = await User.create({ name: 'Maintenance Staff', email: 'staff2@rentdito.com', passwordHash: defaultPassword, role: 'staff', positionName: 'Maintenance', permissions: ['manage_maintenance'], verificationStatus: 'verified', landlordId: landlord1._id });
  const staff3 = await User.create({ name: 'Finance Staff', email: 'staff3@rentdito.com', passwordHash: defaultPassword, role: 'staff', positionName: 'Accountant', permissions: ['manage_payments'], verificationStatus: 'verified', landlordId: landlord2._id });

  const user1 = await User.create({ name: 'User One', email: 'user1@rentdito.com', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user2 = await User.create({ name: 'User Two', email: 'user2@rentdito.com', passwordHash: defaultPassword, role: 'user', verificationStatus: 'verified' });
  const user3 = await User.create({ name: 'User Three', email: 'user3@rentdito.com', passwordHash: defaultPassword, role: 'user', verificationStatus: 'pending' });
  const user4 = await User.create({ name: 'User Four', email: 'user4@rentdito.com', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });
  const user5 = await User.create({ name: 'User Five', email: 'user5@rentdito.com', passwordHash: defaultPassword, role: 'user', verificationStatus: 'unverified' });

  return [superAdmin, landlord1, landlord2, staff1, staff2, staff3, user1, user2, user3, user4, user5];
};

const seedProperties = async (users: any[]) => {
  console.log('Seeding properties...');
  // Placeholder logic
  return []; // Return created properties
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
