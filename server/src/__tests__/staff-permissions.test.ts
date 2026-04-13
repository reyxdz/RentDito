import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';

describe('Staff Invite and Permissions Tests', () => {
  let landlordToken: string;
  let landlordId: string;
  let staffEmail = 'invitedstaff@test.com';
  let staffId: string;
  let staffToken: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['landlord-invite@test.com', staffEmail] },
    });

    // Create landlord
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Landlord Inviter',
        email: 'landlord-invite@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
    landlordId = landlordRes.body.data.user.id;

    // Promote to landlord
    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    // Re-login
    const landlordLogin = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'landlord-invite@test.com',
        password: 'Password123!',
      });
    landlordToken = landlordLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['landlord-invite@test.com', staffEmail] },
    });
    await mongoose.connection.close();
    server.close();
  });

  describe('1. Staff Invitation', () => {
    it('should invite staff member successfully', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          email: staffEmail,
          name: 'Invited Staff',
          positionName: 'Property Manager',
          permissions: ['dashboard', 'properties', 'tenants'],
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.email).toBe(staffEmail);
      expect(response.body.data.role).toBe('staff');
      expect(response.body.data.landlordId).toBe(landlordId);

      staffId = response.body.data._id;
    });

    it('should fail to invite duplicate staff', async () => {
      const response = await request(server)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          email: staffEmail,
          name: 'Duplicate Staff',
          positionName: 'Manager',
          permissions: ['dashboard'],
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('2. Staff Login and Access', () => {
    it('should allow staff to login with temporary password', async () => {
      // In real scenario, staff would receive email with temp password
      // For testing, we'll set a known password
      const tempPassword = 'TempPassword123!';
      const staff = await User.findById(staffId);
      if (staff) {
        const { hash } = await import('../utils/password');
        staff.passwordHash = await hash(tempPassword);
        await staff.save();
      }

      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: staffEmail,
          password: tempPassword,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe('staff');

      staffToken = response.body.data.accessToken;
    });

    it('should allow staff to access their profile', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.role).toBe('staff');
      expect(response.body.data.landlordId).toBe(landlordId);
      expect(response.body.data.permissions).toContain('dashboard');
      expect(response.body.data.permissions).toContain('properties');
      expect(response.body.data.permissions).toContain('tenants');
    });
  });

  describe('3. Permission Enforcement', () => {
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

    it('should block staff from updating other staff permissions', async () => {
      const response = await request(server)
        .patch(`/api/team/${staffId}/permissions`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          permissions: ['dashboard', 'properties', 'tenants', 'financials'],
        })
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('4. Landlord Permission Management', () => {
    it('should allow landlord to update staff permissions', async () => {
      const response = await request(server)
        .patch(`/api/team/${staffId}/permissions`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          permissions: ['dashboard', 'properties'],
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.permissions).toEqual(['dashboard', 'properties']);
    });

    it('should verify staff has updated permissions', async () => {
      // Re-login to get updated token
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({
          email: staffEmail,
          password: 'TempPassword123!',
        });
      staffToken = loginRes.body.data.accessToken;

      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body.data.permissions).toEqual(['dashboard', 'properties']);
      expect(response.body.data.permissions).not.toContain('tenants');
    });

    it('should allow landlord to remove staff', async () => {
      const response = await request(server)
        .delete(`/api/team/${staffId}`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should verify staff is removed', async () => {
      const response = await request(server)
        .get('/api/team')
        .set('Authorization', `Bearer ${landlordToken}`)
        .expect(200);

      const staffMember = response.body.data.find((s: any) => s._id === staffId);
      expect(staffMember).toBeUndefined();
    });
  });
});
