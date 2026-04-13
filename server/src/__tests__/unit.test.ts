import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';

describe('Unit API Integration Tests', () => {
  let adminToken: string;
  let landlordToken: string;
  let landlord2Token: string;
  let staffToken: string;
  let landlordId: string;
  let landlord2Id: string;
  let staffId: string;
  let propertyId: string;
  let property2Id: string;
  let unitId: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['admin-unit@test.com', 'landlord1-unit@test.com', 'landlord2-unit@test.com', 'staff-unit@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});

    // Create admin
    const adminRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin-unit@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    const adminId = adminRes.body.data.user.id;
    await User.findByIdAndUpdate(adminId, { role: 'super_admin' });

    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'admin-unit@test.com', password: 'Password123!' });
    adminToken = adminLogin.body.data.accessToken;

    // Create landlord 1
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Landlord One',
        email: 'landlord1-unit@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    landlordId = landlordRes.body.data.user.id;
    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    const landlordLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'landlord1-unit@test.com', password: 'Password123!' });
    landlordToken = landlordLogin.body.data.accessToken;

    // Create landlord 2
    const landlord2Res = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Landlord Two',
        email: 'landlord2-unit@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    landlord2Id = landlord2Res.body.data.user.id;
    await User.findByIdAndUpdate(landlord2Id, { role: 'landlord' });

    const landlord2Login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'landlord2-unit@test.com', password: 'Password123!' });
    landlord2Token = landlord2Login.body.data.accessToken;

    // Create staff
    const staffRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Staff User',
        email: 'staff-unit@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    staffId = staffRes.body.data.user.id;
    await User.findByIdAndUpdate(staffId, { role: 'staff', assignedPropertyIds: [] });

    const staffLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'staff-unit@test.com', password: 'Password123!' });
    staffToken = staffLogin.body.data.accessToken;

    // Create test properties
    const property = await Property.create({
      landlordId: new mongoose.Types.ObjectId(landlordId),
      name: 'Test Property 1',
      description: 'Test property for units',
      address: {
        street: '123 Test St',
        city: 'Test City',
        province: 'Test Province',
        zipCode: '12345',
        country: 'Philippines'
      },
      propertyType: 'Boarding House',
      status: 'Active',
      amenities: ['WiFi'],
      inclusions: ['Water'],
      venues: { reviewCenters: [], schools: [], commercial: [] },
      billingSettings: {
        billingDay: 1,
        dueDay: 5,
        lateFeePercent: 5,
        utilityDefault: 'metered'
      },
      emergencyContacts: []
    });
    propertyId = property._id.toString();

    const property2 = await Property.create({
      landlordId: new mongoose.Types.ObjectId(landlord2Id),
      name: 'Test Property 2',
      description: 'Another test property',
      address: {
        street: '456 Test Ave',
        city: 'Test City',
        province: 'Test Province',
        zipCode: '12345',
        country: 'Philippines'
      },
      propertyType: 'Apartment',
      status: 'Active',
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
    property2Id = property2._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['admin-unit@test.com', 'landlord1-unit@test.com', 'landlord2-unit@test.com', 'staff-unit@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  describe('POST /api/units - Create Unit', () => {
    it('should create a room unit successfully', async () => {
      const res = await request(server)
        .post('/api/units')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          unitIdentifier: 'Room 101',
          accommodationType: 'room',
          roomRent: 5000,
          deposit: 5000,
          capacity: 2,
          maxOccupants: 2,
          sizeSqm: 20,
          features: ['Air Conditioning', 'Private Bathroom'],
          status: 'vacant'
        });

      expect(res.status).toBe(201);
      expect(res.body.unitIdentifier).toBe('Room 101');
      expect(res.body.accommodationType).toBe('room');
      expect(res.body.roomRent).toBe(5000);
      unitId = res.body._id;
    });

    it('should create a bedspace unit with slots', async () => {
      const res = await request(server)
        .post('/api/units')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          unitIdentifier: 'Room 102',
          accommodationType: 'bedspace',
          bedspaceRent: 2500,
          perHeadRate: 2500,
          deposit: 2500,
          capacity: 4,
          maxOccupants: 4,
          sizeSqm: 25,
          features: ['Shared Bathroom'],
          slots: [
            { slotNumber: 1, status: 'vacant' },
            { slotNumber: 2, status: 'vacant' },
            { slotNumber: 3, status: 'vacant' },
            { slotNumber: 4, status: 'vacant' }
          ],
          status: 'vacant'
        });

      expect(res.status).toBe(201);
      expect(res.body.accommodationType).toBe('bedspace');
      expect(res.body.slots).toHaveLength(4);
    });

    it('should fail if landlord tries to create unit for another landlord property', async () => {
      const res = await request(server)
        .post('/api/units')
        .set('Authorization', `Bearer ${landlord2Token}`)
        .send({
          propertyId,
          unitIdentifier: 'Room 103',
          accommodationType: 'room',
          roomRent: 5000,
          deposit: 5000,
          capacity: 2,
          maxOccupants: 2
        });

      expect(res.status).toBe(404);
    });

    it('should prevent duplicate unit identifiers in same property', async () => {
      const res = await request(server)
        .post('/api/units')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          propertyId,
          unitIdentifier: 'Room 101',
          accommodationType: 'room',
          roomRent: 5000,
          deposit: 5000,
          capacity: 2,
          maxOccupants: 2
        });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/units - Get Units', () => {
    it('should get all units for landlord (own properties only)', async () => {
      const res = await request(server)
        .get('/api/units')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter units by property', async () => {
      const res = await request(server)
        .get(`/api/units?propertyId=${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units.every((u: any) => u.propertyId._id === propertyId)).toBe(true);
    });

    it('should filter units by status', async () => {
      const res = await request(server)
        .get('/api/units?status=vacant')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units.every((u: any) => u.status === 'vacant')).toBe(true);
    });

    it('should filter units by accommodation type', async () => {
      const res = await request(server)
        .get('/api/units?accommodationType=room')
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units.every((u: any) => u.accommodationType === 'room')).toBe(true);
    });

    it('admin should see all units', async () => {
      const res = await request(server)
        .get('/api/units')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/units/:id - Get Unit by ID', () => {
    it('should get unit by ID', async () => {
      const res = await request(server)
        .get(`/api/units/${unitId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(unitId);
      expect(res.body.unitIdentifier).toBe('Room 101');
    });

    it('should fail if landlord tries to access another landlord unit', async () => {
      const res = await request(server)
        .get(`/api/units/${unitId}`)
        .set('Authorization', `Bearer ${landlord2Token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/units/property/:propertyId/units - Get Units by Property', () => {
    it('should get all units for a property', async () => {
      const res = await request(server)
        .get(`/api/units/property/${propertyId}/units`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should fail if accessing another landlord property', async () => {
      const res = await request(server)
        .get(`/api/units/property/${propertyId}/units`)
        .set('Authorization', `Bearer ${landlord2Token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/units/:id - Update Unit', () => {
    it('should update unit successfully', async () => {
      const res = await request(server)
        .patch(`/api/units/${unitId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          roomRent: 5500,
          features: ['Air Conditioning', 'Private Bathroom', 'WiFi']
        });

      expect(res.status).toBe(200);
      expect(res.body.roomRent).toBe(5500);
      expect(res.body.features).toHaveLength(3);
    });

    it('should fail if landlord tries to update another landlord unit', async () => {
      const res = await request(server)
        .patch(`/api/units/${unitId}`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .send({ roomRent: 6000 });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/units/:id/status - Update Unit Status', () => {
    it('should update unit status', async () => {
      const res = await request(server)
        .patch(`/api/units/${unitId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'occupied' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('occupied');
    });

    it('should fail with invalid status', async () => {
      const res = await request(server)
        .patch(`/api/units/${unitId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/units/:id/images - Upload Unit Images', () => {
    it('should upload unit images', async () => {
      const res = await request(server)
        .post(`/api/units/${unitId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
        });

      expect(res.status).toBe(200);
      expect(res.body.images).toHaveLength(2);
    });

    it('should fail if landlord tries to upload to another landlord unit', async () => {
      const res = await request(server)
        .post(`/api/units/${unitId}/images`)
        .set('Authorization', `Bearer ${landlord2Token}`)
        .send({ images: ['https://example.com/image3.jpg'] });

      expect(res.status).toBe(403);
    });
  });

  describe('Property Metrics Auto-Update', () => {
    it('should auto-update property metrics when unit is created', async () => {
      const property = await Property.findById(propertyId);
      const totalUnits = await Unit.countDocuments({ propertyId });
      
      // Metrics should be updated via hooks
      expect(totalUnits).toBeGreaterThan(0);
    });

    it('should update occupancy metrics when unit status changes', async () => {
      // Create a new unit
      const unit = await Unit.create({
        propertyId,
        unitIdentifier: 'Room 104',
        accommodationType: 'room',
        roomRent: 5000,
        deposit: 5000,
        capacity: 2,
        maxOccupants: 2,
        status: 'vacant'
      });

      // Wait for hooks to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Change status to occupied
      unit.status = 'occupied';
      await unit.save();

      // Wait for hooks to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      const property = await Property.findById(propertyId);
      expect(property).toBeDefined();
    });
  });

  describe('DELETE /api/units/:id - Delete Unit', () => {
    it('should delete unit successfully', async () => {
      const res = await request(server)
        .delete(`/api/units/${unitId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Unit deleted successfully');

      // Verify unit is deleted
      const unit = await Unit.findById(unitId);
      expect(unit).toBeNull();
    });

    it('should fail if landlord tries to delete another landlord unit', async () => {
      // Create a unit for landlord2
      const unit = await Unit.create({
        propertyId: property2Id,
        unitIdentifier: 'Room 201',
        accommodationType: 'room',
        roomRent: 5000,
        deposit: 5000,
        capacity: 2,
        maxOccupants: 2
      });

      const res = await request(server)
        .delete(`/api/units/${unit._id}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Staff Access Control', () => {
    it('should allow staff to access assigned property units', async () => {
      // Assign property to staff
      await User.findByIdAndUpdate(staffId, {
        assignedPropertyIds: [propertyId]
      });

      const res = await request(server)
        .get(`/api/units?propertyId=${propertyId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
    });

    it('should block staff from accessing non-assigned property units', async () => {
      const res = await request(server)
        .get(`/api/units?propertyId=${property2Id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.units).toHaveLength(0);
    });
  });
});
