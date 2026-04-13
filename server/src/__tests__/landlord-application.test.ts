import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';
import { LandlordApplication } from '../models/LandlordApplication';

describe('Landlord Application Flow Tests', () => {
  let userToken: string;
  let userId: string;
  let adminToken: string;
  let applicationId: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['applicant@test.com', 'admin@test.com'] },
    });
    await LandlordApplication.deleteMany({});

    // Create regular user
    const userRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Applicant User',
        email: 'applicant@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    userToken = userRes.body.data.accessToken;
    userId = userRes.body.data.user.id;

    // Create admin
    const adminRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    const adminId = adminRes.body.data.user.id;

    // Promote to super_admin
    await User.findByIdAndUpdate(adminId, { role: 'super_admin' });

    // Re-login to get updated token
    const adminLogin = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Password123!',
      });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['applicant@test.com', 'admin@test.com'] },
    });
    await LandlordApplication.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  describe('1. Apply for Landlord', () => {
    it('should submit landlord application successfully', async () => {
      const response = await request(server)
        .post('/api/landlord-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          businessName: 'Test Properties LLC',
          businessAddress: '123 Main St, City, State 12345',
          taxId: '12-3456789',
          propertyCount: 5,
          description: 'I own multiple rental properties and want to manage them on this platform.',
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.userId).toBe(userId);

      applicationId = response.body.data._id;
    });

    it('should fail to submit duplicate application', async () => {
      const response = await request(server)
        .post('/api/landlord-applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          businessName: 'Another Business',
          businessAddress: '456 Oak St',
          taxId: '98-7654321',
          propertyCount: 3,
          description: 'Another application',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already');
    });

    it('should retrieve own application', async () => {
      const response = await request(server)
        .get('/api/landlord-applications/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('pending');
    });
  });

  describe('2. Admin Approval', () => {
    it('should allow admin to view all applications', async () => {
      const response = await request(server)
        .get('/api/landlord-applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should allow admin to approve application', async () => {
      const response = await request(server)
        .patch(`/api/landlord-applications/${applicationId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('approved');
    });

    it('should verify user role is promoted to landlord', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.role).toBe('landlord');
    });
  });

  describe('3. Post-Approval Access', () => {
    it('should allow new landlord to access team routes', async () => {
      // Re-login to get updated token with new role
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'applicant@test.com',
          password: 'Password123!',
        });
      userToken = loginRes.body.data.accessToken;

      const response = await request(server)
        .get('/api/team')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should allow new landlord to invite staff', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newstaff@test.com',
          name: 'New Staff Member',
          positionName: 'Property Manager',
          permissions: ['dashboard', 'properties'],
        })
        .expect(201);

      expect(response.body.status).toBe('success');
    });
  });

  describe('4. Rejection Flow', () => {
    let rejectedUserToken: string;
    let rejectedApplicationId: string;

    beforeAll(async () => {
      // Create another user for rejection test
      const userRes = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Rejected User',
          email: 'rejected@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });
      rejectedUserToken = userRes.body.data.accessToken;

      // Submit application
      const appRes = await request(server)
        .post('/api/landlord-applications')
        .set('Authorization', `Bearer ${rejectedUserToken}`)
        .send({
          businessName: 'Rejected Business',
          businessAddress: '789 Elm St',
          taxId: '11-2233445',
          propertyCount: 1,
          description: 'Test rejection',
        });
      rejectedApplicationId = appRes.body.data._id;
    });

    afterAll(async () => {
      await User.deleteOne({ email: 'rejected@test.com' });
    });

    it('should allow admin to reject application', async () => {
      const response = await request(server)
        .patch(`/api/landlord-applications/${rejectedApplicationId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Insufficient property documentation',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.status).toBe('rejected');
    });

    it('should verify user role remains as user', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${rejectedUserToken}`)
        .expect(200);

      expect(response.body.data.role).toBe('user');
    });
  });
});
