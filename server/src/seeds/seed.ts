import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

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
  // Placeholder: Example of clearing all collections
  // await User.deleteMany();
  // await Property.deleteMany();
  // await Lease.deleteMany();
  console.log('Database cleared!');
};

const seedUsers = async () => {
  console.log('Seeding users...');
  // Placeholder logic: create admin, landlord, tenant users
  return []; // Return created users to pass to next seeders
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
