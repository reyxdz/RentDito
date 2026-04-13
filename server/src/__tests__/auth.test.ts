import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';

describe('Auth Flow Integration Tests', () => {
  let testUser = {
    name: 'Test User',
    email: 'testuser@example.com',
    phone: '+1234567890',
    password: 'TestPassword123!',
  };

  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up test user if exists
    await User.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ email: testUser.email });
    await mongoose.connection.close();
    server.close();
  });

  describe('1. Register Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          ...testUser,
          confirmPassword: testUser.password,
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      userId = response.body.data.user.id;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail to register with duplicate email', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          ...testUser,
          confirmPassword: testUser.password,
        })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already registered');
    });

    it('should fail to register with mismatched passwords', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'another@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should fail to register with weak password', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weak@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('2. Login Flow', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail to login with non-existent email', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('3. Refresh Token Flow', () => {
    it('should refresh access token successfully', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.accessToken).not.toBe(accessToken);

      accessToken = response.body.data.accessToken;
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('4. Change Password Flow', () => {
    const newPassword = 'NewPassword123!';

    it('should change password successfully', async () => {
      const response = await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('successfully');
    });

    it('should fail to change password with wrong current password', async () => {
      const response = await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'AnotherPassword123!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('incorrect');
    });

    it('should fail to login with old password', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should login successfully with new password', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testUser.email);

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
  });

  describe('5. Logout Flow', () => {
    it('should logout successfully', async () => {
      const response = await request(server)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
    });

    it('should fail to refresh with logged out token', async () => {
      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
