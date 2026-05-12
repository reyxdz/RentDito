import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db';
import { User } from './src/models/User';
import { Property } from './src/models/Property';
import { Unit } from './src/models/Unit';
import { RentalApplication } from './src/models/RentalApplication';
import { Contract } from './src/models/Contract';
import { Tenancy } from './src/models/Tenancy';
import { confirmCheckin, initiateCheckout } from './src/services/tenancy.service';

dotenv.config();

const runTest = async () => {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected.');

  try {
    // 1. Create a Landlord
    const landlord = await User.create({
      name: 'Test Landlord',
      email: `landlord_${Date.now()}@test.com`,
      passwordHash: 'dummyhash',
      role: 'landlord',
      status: 'active',
    });
    console.log(`✅ Created Landlord: ${landlord._id}`);

    // 2. Create a Tenant
    const tenant = await User.create({
      name: 'Test Tenant',
      email: `tenant_${Date.now()}@test.com`,
      passwordHash: 'dummyhash',
      role: 'user',
      status: 'active',
      verificationStatus: 'verified'
    });
    console.log(`✅ Created Tenant: ${tenant._id}`);

    // 3. Create a Property
    const property = await Property.create({
      landlordId: landlord._id,
      name: 'Test Property',
      description: 'Test Description',
      address: {
        street: '123 Test St',
        city: 'Test City',
        province: 'Test Province',
        zipCode: '1234',
        country: 'Philippines'
      },
      propertyType: 'Apartment',
      status: 'Active',
      emergencyContacts: []
    });
    console.log(`✅ Created Property: ${property._id}`);

    // 4. Create a Unit (Room mode)
    const unit = await Unit.create({
      propertyId: property._id,
      unitIdentifier: `A101_${Date.now()}`,
      accommodationType: 'room',
      roomRent: 5000,
      deposit: 10000,
      capacity: 2,
      maxOccupants: 3,
      features: [],
      images: [],
      status: 'vacant'
    });
    console.log(`✅ Created vacant Unit: ${unit._id}`);

    // 5. Create a RentalApplication
    const application = await RentalApplication.create({
      userId: tenant._id,
      propertyId: property._id,
      unitId: unit._id,
      personalDetails: {
        fullName: 'Test Tenant',
        phone: '1234567890',
        occupation: 'Student',
        address: 'Test Address',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '0987654321',
          relationship: 'Parent'
        }
      },
      documents: [],
      status: 'approved',
      reviewedBy: landlord._id,
      reviewedAt: new Date()
    });
    console.log(`✅ Created approved RentalApplication: ${application._id}`);

    // 6. Create a Signed Contract
    const contract = await Contract.create({
      applicationId: application._id,
      propertyId: property._id,
      unitId: unit._id,
      landlordId: landlord._id,
      userId: tenant._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      lockInPeriod: 6,
      monthlyRent: 5000,
      securityDeposit: 10000,
      advancePayment: 5000,
      utilityIncludedInRent: false,
      rateType: 'fixed',
      status: 'signed',
      landlordSignature: 'base64sig1',
      userSignature: 'base64sig2'
    });
    console.log(`✅ Created signed Contract: ${contract._id}`);

    console.log('\n--- TESTING CONFIRM CHECK-IN ---');
    const checkedInTenancy: any = await confirmCheckin(landlord._id.toString(), contract._id.toString());
    console.log(`✅ confirmCheckin succeeded! Returned Tenancy ID: ${checkedInTenancy._id}`);
    
    // Validate state changes
    const updatedUnit1 = await Unit.findById(unit._id);
    const updatedContract1 = await Contract.findById(contract._id);
    console.log(`   Unit Status: ${updatedUnit1?.status} (Expected: occupied)`);
    console.log(`   Contract Status: ${updatedContract1?.status} (Expected: active)`);
    if (updatedUnit1?.status !== 'occupied' || updatedContract1?.status !== 'active') {
      throw new Error('Check-in state validation failed!');
    }

    console.log('\n--- TESTING INITIATE CHECKOUT ---');
    const checkedOutTenancy: any = await initiateCheckout(landlord._id.toString(), checkedInTenancy._id.toString());
    console.log(`✅ initiateCheckout succeeded! Returned Tenancy Status: ${checkedOutTenancy.status}`);

    // Validate state changes
    const updatedUnit2 = await Unit.findById(unit._id);
    const updatedContract2 = await Contract.findById(contract._id);
    console.log(`   Unit Status: ${updatedUnit2?.status} (Expected: vacant)`);
    console.log(`   Contract Status: ${updatedContract2?.status} (Expected: expired)`);
    if (updatedUnit2?.status !== 'vacant' || updatedContract2?.status !== 'expired') {
      throw new Error('Checkout state validation failed!');
    }

    console.log('\n🎉 All backend flow validations PASSED successfully!');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
  } finally {
    console.log('Closing database connection...');
    mongoose.disconnect();
  }
};

runTest();
