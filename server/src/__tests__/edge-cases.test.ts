import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import server from '../server';
import { User } from '../models/User';

describe('Edge Cases and Security Tests', () => {
  let validToken: string;
  let validRefreshToken: string;
  let userId: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({ email: 'edgecase@test.com' });

    // Create test user
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Edge Case User',
        email: 'edgecase@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });

    validToken = response.body.data.accessToken;
    validRefreshToken = response.body.data.refreshToken;
    userId = response.body.data.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'edgecase@test.com' });
    await mongoose.connection.close();
    server.close();
  });

  describe('1. Expired Token Tests', () => {
    it('should reject expired access token', async () => {
      const expiredToken = jwt.sign(
        { id: userId, role: 'user' },
        process.env.JWT_ACCESS_SECRET || 'fallback_access_secret',
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should reject expired refresh token', async () => {
      const expiredRefreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('2. Invalid JWT Tests', () => {
    it('should reject malformed JWT', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should reject JWT with invalid signature', async () => {
      const invalidToken = jwt.sign(
        { id: userId, role: 'user' },
        'wrong_secret',
        { expiresIn: '1h' }
      );

      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should reject JWT without Bearer prefix', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .set('Authorization', validToken)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should reject request without Authorization header', async () => {
      const response = await request(server)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('3. Duplicate Email Tests', () => {
    it('should reject registration with existing email', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'edgecase@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
        .expect(409);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('already registered');
    });

    it('should handle case-insensitive email duplicates', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Case Insensitive User',
          email: 'EDGECASE@TEST.COM',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
        .expect(409);

      expect(response.body.status).toBe('error');
    });
  });

  describe('4. Token Reuse Detection', () => {
    it('should invalidate refresh token after use', async () => {
      // Use refresh token once
      const firstRefresh = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      const newRefreshToken = firstRefresh.body.data.refreshToken;

      // Try to use old refresh token again
      const secondRefresh = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(401);

      expect(secondRefresh.body.status).toBe('error');

      // New token should work
      const thirdRefresh = await request(server)
        .post('/api/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      expect(thirdRefresh.body.status).toBe('success');
    });
  });

  describe('5. SQL Injection Attempts', () => {
    it('should handle SQL injection in email field', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'anything',
        })
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should handle NoSQL injection attempts', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null },
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('6. XSS Prevention', () => {
    it('should sanitize script tags in name field', async () => {
      const response = await request(server)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: '<script>alert("XSS")</script>',
        })
        .expect(200);

      expect(response.body.data.name).not.toContain('<script>');
    });
  });

  describe('7. Rate Limiting (if implemented)', () => {
    it('should handle multiple rapid requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(server)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrong',
          })
      );

      const responses = await Promise.all(requests);
      
      // All should be handled without crashing
      responses.forEach(res => {
        expect([401, 429]).toContain(res.status);
      });
    });
  });

  describe('8. Invalid Input Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should reject password shorter than 8 characters', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'short@test.com',
          password: 'Short1!',
          confirmPassword: 'Short1!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should reject missing required fields', async () => {
      const response = await request(server)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@test.com',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('9. Suspended Account', () => {
    beforeAll(async () => {
      await User.findByIdAndUpdate(userId, { status: 'suspended' });
    });

    afterAll(async () => {
      await User.findByIdAndUpdate(userId, { status: 'active' });
    });

    it('should block login for suspended account', async () => {
      const response = await request(server)
        .post('/api/auth/login')
        .send({
          email: 'edgecase@test.com',
          password: 'Password123!',
        })
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('suspended');
    });
  });

  describe('10. Password Reset Edge Cases', () => {
    it('should not reveal if email exists in forgot password', async () => {
      const response = await request(server)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test.com',
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).not.toContain('not found');
    });

    it('should reject invalid reset token', async () => {
      const response = await request(server)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});
