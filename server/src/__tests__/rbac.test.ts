import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';

describe('RBAC Integration Tests', () => {
  let landlordToken: string;
  let staffToken: string;
  let userToken: string;
  let landlordId: string;
  let staffId: string;

  beforeAll(async () => {
    // Clean up test users
    await User.deleteMany({
      email: { $in: ['landlord@test.com', 'staff@test.com', 'user@test.com'] },
    });

    // Create landlord
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Landlord',
        email: 'landlord@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    landlordToken = landlordRes.body.data.accessToken;
    landlordId = landlordRes.body.data.user.id;

    // Manually promote to landlord
    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    // Re-login to get updated token
    const landlordLogin = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'landlord@test.com',
        password: 'Password123!',
      });
    landlordToken = landlordLogin.body.data.accessToken;

    // Create staff
    const staffRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Staff',
        email: 'staff@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    staffToken = staffRes.body.data.accessToken;
    staffId = staffRes.body.data.user.id;

    // Manually set as staff
    await User.findByIdAndUpdate(staffId, {
      role: 'staff',
      landlordId: landlordId,
      permissions: ['dashboard', 'tenants'],
    });

    // Re-login to get updated token
    const staffLogin = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'staff@test.com',
        password: 'Password123!',
      });
    staffToken = staffLogin.body.data.accessToken;

    // Create regular user
    const userRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'user@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    userToken = userRes.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['landlord@test.com', 'staff@test.com', 'user@test.com'] },
    });
    await mongoose.connection.close();
    server.close();
  });

  describe('Landlord Access', () => {
    it('should allow landlord to access team management', async () => {
      const response = await request(server)
        .get('/api/team')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should allow landlord to invite staff', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          email: 'newstaff@test.com',
          name: 'New Staff',
          positionName: 'Property Manager',
          permissions: ['dashboard', 'properties'],
        })
        .expect(201);

      expect(response.body.status).toBe('success');
    });
  });

  describe('Staff Access', () => {
    it('should allow staff to access team list', async () => {
      const response = await request(server)
        .get('/api/team')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should block staff from inviting other staff', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'blocked@test.com',
          name: 'Blocked Staff',
          positionName: 'Manager',
          permissions: ['dashboard'],
        })
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('User Access', () => {
    it('should block regular user from accessing team routes', async () => {
      const response = await request(server)
        .get('/api/team')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should block regular user from inviting staff', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'blocked2@test.com',
          name: 'Blocked Staff 2',
          positionName: 'Manager',
          permissions: ['dashboard'],
        })
        .expect(403);

      expect(response.body.status).toBe('error');
    });

    it('should allow regular user to access their profile', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.role).toBe('user');
    });
  });

  describe('Unauthenticated Access', () => {
    it('should block access without token', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should block access with invalid token', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
