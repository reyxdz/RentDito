import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';
import { Property } from '../models/Property';

describe('Property Backend Integration Tests', () => {
  let landlordToken: string;
  let landlordId: string;
  let staffToken: string;
  let staffId: string;
  let userToken: string;
  let propertyId: string;
  let property2Id: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['landlord-prop@test.com', 'staff-prop@test.com', 'user-prop@test.com'] },
    });
    await Property.deleteMany({});

    // Create landlord
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Property Landlord',
        email: 'landlord-prop@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    landlordId = landlordRes.body.data.user.id;

    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    const landlordLogin = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'landlord-prop@test.com',
        password: 'Password123!',
      });
    landlordToken = landlordLogin.body.data.accessToken;

    // Create staff
    const staffRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Property Staff',
        email: 'staff-prop@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    staffId = staffRes.body.data.user.id;

    // Create regular user
    const userRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Property User',
        email: 'user-prop@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    userToken = userRes.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['landlord-prop@test.com', 'staff-prop@test.com', 'user-prop@test.com'] },
    });
    await Property.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  describe('1. Create Property', () => {
    it('should allow landlord to create property', async () => {
      const response = await request(server)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'Sunrise Apartments',
          description: 'Modern apartment complex with great amenities',
          address: {
            street: '123 Main Street',
            city: 'Cebu City',
            province: 'Cebu',
            zipCode: '6000',
            country: 'Philippines',
          },
          amenities: ['WiFi', 'Parking', 'Security'],
          inclusions: ['Water', 'Electricity'],
          propertyType: 'Apartment',
          status: 'Active',
          venues: {
            reviewCenters: [{ name: 'ABC Review Center', distance: '500m' }],
            schools: [{ name: 'University of Cebu', distance: '1km' }],
            commercial: [{ name: 'SM City Cebu', distance: '2km' }],
          },
          billingSettings: {
            billingDay: 1,
            dueDay: 5,
            lateFeePercent: 5,
            utilityDefault: 'metered',
          },
          emergencyContacts: [
            {
              name: 'John Doe',
              phone: '+639123456789',
              role: 'Property Manager',
            },
          ],
          geoCoords: {
            latitude: 10.3157,
            longitude: 123.8854,
          },
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe('Sunrise Apartments');
      expect(response.body.data.landlordId._id).toBe(landlordId);
      expect(response.body.data.billingSettings.billingDay).toBe(1);
      expect(response.body.data.emergencyContacts).toHaveLength(1);

      propertyId = response.body.data._id;
    });

    it('should block regular user from creating property', async () => {
      const response = await request(server)
        .post('/api/properties')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Property',
          description: 'This should fail',
          address: {
            street: '456 Test St',
            city: 'Manila',
            province: 'Metro Manila',
            zipCode: '1000',
          },
          propertyType: 'Apartment',
        })
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'No',
          description: 'Short',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('2. Get Properties', () => {
    beforeAll(async () => {
      // Create second property
      const res = await request(server)
        .post('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'Sunset Boarding House',
          description: 'Cozy boarding house near universities',
          address: {
            street: '789 University Ave',
            city: 'Cebu City',
            province: 'Cebu',
            zipCode: '6000',
          },
          propertyType: 'Boarding House',
          amenities: ['WiFi', 'Kitchen'],
        });
      property2Id = res.body.data._id;
    });

    it('should return landlord own properties', async () => {
      const response = await request(server)
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter properties by status', async () => {
      const response = await request(server)
        .get('/api/properties?status=Active')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((prop: any) => {
        expect(prop.status).toBe('Active');
      });
    });

    it('should filter properties by type', async () => {
      const response = await request(server)
        .get('/api/properties?propertyType=Apartment')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((prop: any) => {
        expect(prop.propertyType).toBe('Apartment');
      });
    });

    it('should include computed metrics', async () => {
      const response = await request(server)
        .get('/api/properties')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data[0].metrics).toBeDefined();
      expect(response.body.data[0].metrics).toHaveProperty('totalUnits');
      expect(response.body.data[0].metrics).toHaveProperty('occupiedUnits');
      expect(response.body.data[0].metrics).toHaveProperty('occupancyRate');
    });
  });

  describe('3. Get Single Property', () => {
    it('should return property details', async () => {
      const response = await request(server)
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(propertyId);
      expect(response.body.data.name).toBe('Sunrise Apartments');
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should return 404 for non-existent property', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(server)
        .get(`/api/properties/${fakeId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('4. Update Property', () => {
    it('should update property details', async () => {
      const response = await request(server)
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          name: 'Sunrise Apartments Updated',
          description: 'Updated description with more details',
          amenities: ['WiFi', 'Parking', 'Security', 'Gym'],
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe('Sunrise Apartments Updated');
      expect(response.body.data.amenities).toContain('Gym');
    });

    it('should update billing settings', async () => {
      const response = await request(server)
        .patch(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          billingSettings: {
            billingDay: 15,
            dueDay: 20,
            lateFeePercent: 10,
            utilityDefault: 'included',
          },
        })
        .expect(200);

      expect(response.body.data.billingSettings.billingDay).toBe(15);
      expect(response.body.data.billingSettings.utilityDefault).toBe('included');
    });
  });

  describe('5. Update Property Status', () => {
    it('should update property status', async () => {
      const response = await request(server)
        .patch(`/api/properties/${propertyId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'Maintenance' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('Maintenance');
    });

    it('should validate status value', async () => {
      const response = await request(server)
        .patch(`/api/properties/${propertyId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'InvalidStatus' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('6. Staff Access Control', () => {
    beforeAll(async () => {
      // Assign property to staff
      await User.findByIdAndUpdate(staffId, {
        role: 'staff',
        landlordId: landlordId,
        assignedPropertyIds: [propertyId],
        permissions: ['dashboard', 'properties'],
      });

      const staffLogin = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'staff-prop@test.com',
          password: 'Password123!',
        });
      staffToken = staffLogin.body.data.accessToken;
    });

    it('should allow staff to view assigned property', async () => {
      const response = await request(server)
        .get(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data._id).toBe(propertyId);
    });

    it('should block staff from viewing non-assigned property', async () => {
      const response = await request(server)
        .get(`/api/properties/${property2Id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    it('should only return assigned properties in list', async () => {
      const response = await request(server)
        .get('/api/properties')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]._id).toBe(propertyId);
    });
  });

  describe('7. Delete Property', () => {
    it('should soft delete (archive) property', async () => {
      const response = await request(server)
        .delete(`/api/properties/${property2Id}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should verify property is archived', async () => {
      const response = await request(server)
        .get(`/api/properties/${property2Id}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('Archived');
    });

    it('should block regular user from deleting', async () => {
      const response = await request(server)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('8. Upload Property Images', () => {
    it('should upload property images', async () => {
      const response = await request(server)
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          imageUrls: [
            'https://cloudinary.com/image1.jpg',
            'https://cloudinary.com/image2.jpg',
          ],
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.images).toContain('https://cloudinary.com/image1.jpg');
    });

    it('should fail without images', async () => {
      const response = await request(server)
        .post(`/api/properties/${propertyId}/images`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ imageUrls: [] })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});
