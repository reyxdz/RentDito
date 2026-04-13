import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';

describe('Public API & Verification Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let landlordId: string;
  let propertyId: string;
  let unitId: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['admin-public@test.com', 'user-public@test.com', 'landlord-public@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});

    // Create admin
    const adminRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin-public@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    const adminId = adminRes.body.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'super_admin' });

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin-public@test.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    // Create regular user
    const userRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Regular User',
        email: 'user-public@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    userId = userRes.body.data.user.id;
    userToken = userRes.body.data.accessToken;

    // Create landlord
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Landlord User',
        email: 'landlord-public@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    landlordId = landlordRes.body.data.user.id;
    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    // Create active property with units
    const property = await Property.create({
      landlordId: new mongoose.Types.ObjectId(landlordId),
      name: 'Sunshine Apartments',
      description: 'Beautiful apartments near downtown',
      address: {
        street: '123 Main St',
        city: 'Cebu City',
        province: 'Cebu',
        zipCode: '6000',
        country: 'Philippines'
      },
      propertyType: 'Apartment',
      status: 'Active',
      amenities: ['WiFi', 'Parking'],
      inclusions: ['Water'],
      venues: { reviewCenters: [], schools: [], commercial: [] },
      billingSettings: {
        billingDay: 1,
        dueDay: 5,
        lateFeePercent: 5,
        utilityDefault: 'metered'
      },
      emergencyContacts: [],
      images: ['https://example.com/image1.jpg']
    });
    propertyId = property._id.toString();

    // Create units
    const unit1 = await Unit.create({
      propertyId: property._id,
      unitIdentifier: 'Unit 101',
      accommodationType: 'room',
      roomRent: 5000,
      deposit: 5000,
      capacity: 2,
      maxOccupants: 2,
      sizeSqm: 25,
      features: ['Air Conditioning'],
      status: 'vacant',
      images: []
    });
    unitId = unit1._id.toString();

    await Unit.create({
      propertyId: property._id,
      unitIdentifier: 'Unit 102',
      accommodationType: 'bedspace',
      bedspaceRent: 2500,
      deposit: 2500,
      capacity: 4,
      maxOccupants: 4,
      sizeSqm: 30,
      features: ['Shared Bathroom'],
      status: 'vacant',
      slots: [
        { slotNumber: 1, status: 'vacant' },
        { slotNumber: 2, status: 'occupied' },
        { slotNumber: 3, status: 'vacant' },
        { slotNumber: 4, status: 'vacant' }
      ],
      images: []
    });

    // Create inactive property (should not appear in public listings)
    await Property.create({
      landlordId: new mongoose.Types.ObjectId(landlordId),
      name: 'Hidden Property',
      description: 'This should not appear',
      address: {
        street: '456 Hidden St',
        city: 'Manila',
        province: 'Metro Manila',
        zipCode: '1000',
        country: 'Philippines'
      },
      propertyType: 'Boarding House',
      status: 'Inactive',
      amenities: [],
      inclusions: [],
      venues: { reviewCenters: [], schools: [], commercial: [] },
      billingSettings: {
        billingDay: 1,
        dueDay: 5,
        lateFeePercent: 5,
        utilityDefault: 'metered'
      },
      emergencyContacts: []
    });
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['admin-public@test.com', 'user-public@test.com', 'landlord-public@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  describe('Public Listings API (No Auth)', () => {
    describe('GET /api/public/listings', () => {
      it('should get all active properties without authentication', async () => {
        const res = await request(server)
          .get('/api/public/listings');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.pagination).toBeDefined();
      });

      it('should include metrics and price range for each property', async () => {
        const res = await request(server)
          .get('/api/public/listings');

        expect(res.status).toBe(200);
        const property = res.body.data[0];
        expect(property.metrics).toBeDefined();
        expect(property.metrics.totalUnits).toBeDefined();
        expect(property.metrics.vacantUnits).toBeDefined();
        expect(property.metrics.occupancyRate).toBeDefined();
        expect(property.priceRange).toBeDefined();
        expect(property.priceRange.min).toBeDefined();
        expect(property.priceRange.max).toBeDefined();
      });

      it('should only return active properties', async () => {
        const res = await request(server)
          .get('/api/public/listings');

        expect(res.status).toBe(200);
        res.body.data.forEach((property: any) => {
          expect(property.status).toBe('Active');
        });
      });

      it('should filter by city', async () => {
        const res = await request(server)
          .get('/api/public/listings?city=Cebu');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        res.body.data.forEach((property: any) => {
          expect(property.address.city.toLowerCase()).toContain('cebu');
        });
      });

      it('should filter by property type', async () => {
        const res = await request(server)
          .get('/api/public/listings?propertyType=Apartment');

        expect(res.status).toBe(200);
        res.body.data.forEach((property: any) => {
          expect(property.propertyType).toBe('Apartment');
        });
      });

      it('should filter by price range', async () => {
        const res = await request(server)
          .get('/api/public/listings?minPrice=2000&maxPrice=6000');

        expect(res.status).toBe(200);
        res.body.data.forEach((property: any) => {
          expect(property.priceRange.max).toBeGreaterThanOrEqual(2000);
          expect(property.priceRange.min).toBeLessThanOrEqual(6000);
        });
      });

      it('should support pagination', async () => {
        const res = await request(server)
          .get('/api/public/listings?page=1&limit=10');

        expect(res.status).toBe(200);
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(10);
      });
    });

    describe('GET /api/public/listings/:id', () => {
      it('should get single property with units without authentication', async () => {
        const res = await request(server)
          .get(`/api/public/listings/${propertyId}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data._id).toBe(propertyId);
        expect(res.body.data.units).toBeDefined();
        expect(Array.isArray(res.body.data.units)).toBe(true);
        expect(res.body.data.units.length).toBeGreaterThan(0);
      });

      it('should include property metrics and price range', async () => {
        const res = await request(server)
          .get(`/api/public/listings/${propertyId}`);

        expect(res.status).toBe(200);
        expect(res.body.data.metrics).toBeDefined();
        expect(res.body.data.priceRange).toBeDefined();
      });

      it('should return 404 for inactive property', async () => {
        const inactiveProperty = await Property.findOne({ status: 'Inactive' });
        const res = await request(server)
          .get(`/api/public/listings/${inactiveProperty!._id}`);

        expect(res.status).toBe(404);
      });

      it('should return 404 for non-existent property', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(server)
          .get(`/api/public/listings/${fakeId}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/public/listings/unit/:id', () => {
      it('should get single unit detail without authentication', async () => {
        const res = await request(server)
          .get(`/api/public/listings/unit/${unitId}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data._id).toBe(unitId);
        expect(res.body.data.propertyId).toBeDefined();
        expect(res.body.data.propertyId.landlordId).toBeDefined();
      });

      it('should return 404 for non-existent unit', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(server)
          .get(`/api/public/listings/unit/${fakeId}`);

        expect(res.status).toBe(404);
      });
    });
  });

  describe('User Verification', () => {
    describe('POST /api/users/me/verify', () => {
      it('should submit verification documents', async () => {
        const res = await request(server)
          .post('/api/users/me/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            imageUrls: [
              'https://example.com/id-front.jpg',
              'https://example.com/id-back.jpg'
            ]
          });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.verificationStatus).toBe('pending');
        expect(res.body.data.idPhotos).toHaveLength(2);
      });

      it('should fail without ID photos', async () => {
        const res = await request(server)
          .post('/api/users/me/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ imageUrls: [] });

        expect(res.status).toBe(400);
      });

      it('should fail if already verified', async () => {
        await User.findByIdAndUpdate(userId, { verificationStatus: 'verified' });

        const res = await request(server)
          .post('/api/users/me/verify')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            imageUrls: ['https://example.com/id.jpg']
          });

        expect(res.status).toBe(400);

        // Reset for other tests
        await User.findByIdAndUpdate(userId, { verificationStatus: 'pending' });
      });
    });
  });

  describe('Admin Verification Management', () => {
    describe('GET /api/admin/verifications', () => {
      it('should get pending verifications for admin', async () => {
        const res = await request(server)
          .get('/api/admin/verifications')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
      });

      it('should fail for non-admin users', async () => {
        const res = await request(server)
          .get('/api/admin/verifications')
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/admin/verifications/all', () => {
      it('should get all verifications with filter', async () => {
        const res = await request(server)
          .get('/api/admin/verifications/all?verificationStatus=pending')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
      });
    });

    describe('PATCH /api/admin/verifications/:userId/approve', () => {
      it('should approve user verification', async () => {
        const res = await request(server)
          .patch(`/api/admin/verifications/${userId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.verificationStatus).toBe('verified');
      });

      it('should fail for non-admin users', async () => {
        const res = await request(server)
          .patch(`/api/admin/verifications/${userId}/approve`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
      });

      it('should fail if verification not pending', async () => {
        const res = await request(server)
          .patch(`/api/admin/verifications/${userId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(400);
      });
    });

    describe('PATCH /api/admin/verifications/:userId/reject', () => {
      beforeAll(async () => {
        // Set user back to pending for rejection test
        await User.findByIdAndUpdate(userId, {
          verificationStatus: 'pending',
          idPhotos: ['https://example.com/id.jpg']
        });
      });

      it('should reject user verification', async () => {
        const res = await request(server)
          .patch(`/api/admin/verifications/${userId}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Invalid ID document' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.verificationStatus).toBe('unverified');
        expect(res.body.data.idPhotos).toHaveLength(0);
      });

      it('should fail for non-admin users', async () => {
        await User.findByIdAndUpdate(userId, { verificationStatus: 'pending' });

        const res = await request(server)
          .patch(`/api/admin/verifications/${userId}/reject`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'Test' });

        expect(res.status).toBe(403);
      });
    });
  });
});
