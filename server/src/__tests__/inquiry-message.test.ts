import request from 'supertest';
import mongoose from 'mongoose';
import server from '../server';
import { User } from '../models/User';
import { Property } from '../models/Property';
import { Unit } from '../models/Unit';
import { Inquiry } from '../models/Inquiry';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';

describe('Inquiry + Conversation + Message Integration Tests', () => {
  let userToken: string;
  let landlordToken: string;
  let userId: string;
  let landlordId: string;
  let propertyId: string;
  let unitId: string;
  let inquiryId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Clean up
    await User.deleteMany({
      email: { $in: ['user-inquiry@test.com', 'landlord-inquiry@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await Inquiry.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});

    // Create verified user
    const userRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'user-inquiry@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    userId = userRes.body.data.user.id;
    userToken = userRes.body.data.accessToken;

    // Verify user
    await User.findByIdAndUpdate(userId, { verificationStatus: 'verified' });

    // Create landlord
    const landlordRes = await request(server)
      .post('/api/auth/register')
      .send({
        name: 'Test Landlord',
        email: 'landlord-inquiry@test.com',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
    landlordId = landlordRes.body.data.user.id;
    await User.findByIdAndUpdate(landlordId, { role: 'landlord' });

    const landlordLogin = await request(server)
      .post('/api/auth/login')
      .send({ email: 'landlord-inquiry@test.com', password: 'Password123!' });
    landlordToken = landlordLogin.body.data.accessToken;

    // Create property
    const property = await Property.create({
      landlordId: new mongoose.Types.ObjectId(landlordId),
      name: 'Test Property',
      description: 'Test property for inquiries',
      address: {
        street: '123 Test St',
        city: 'Test City',
        province: 'Test Province',
        zipCode: '12345',
        country: 'Philippines'
      },
      propertyType: 'Apartment',
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

    // Create unit
    const unit = await Unit.create({
      propertyId: property._id,
      unitIdentifier: 'Unit 101',
      accommodationType: 'room',
      roomRent: 5000,
      deposit: 5000,
      capacity: 2,
      maxOccupants: 2,
      status: 'vacant',
      features: [],
      images: []
    });
    unitId = unit._id.toString();
  });

  afterAll(async () => {
    await User.deleteMany({
      email: { $in: ['user-inquiry@test.com', 'landlord-inquiry@test.com'] }
    });
    await Property.deleteMany({});
    await Unit.deleteMany({});
    await Inquiry.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });

  describe('POST /api/inquiries - Create Inquiry', () => {
    it('should create inquiry with auto-conversation and notification', async () => {
      const res = await request(server)
        .post('/api/inquiries')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          propertyId,
          unitId,
          subject: 'Interested in renting',
          initialMessage: 'Hello, I am interested in this unit. Is it still available?'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.subject).toBe('Interested in renting');
      expect(res.body.data.status).toBe('open');
      inquiryId = res.body.data._id;

      // Verify conversation was created
      const conversation = await Conversation.findOne({ inquiryId });
      expect(conversation).toBeDefined();
      expect(conversation!.participants).toHaveLength(2);
      conversationId = conversation!._id.toString();

      // Verify initial message was created
      const messages = await Message.find({ conversationId: conversation!._id });
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toContain('interested in this unit');

      // Verify notification was created for landlord
      const notification = await Notification.findOne({
        userId: landlordId,
        type: 'inquiry'
      });
      expect(notification).toBeDefined();
      expect(notification!.title).toBe('New Inquiry');
    });

    it('should fail if user is not verified', async () => {
      // Create unverified user
      const unverifiedRes = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Unverified User',
          email: 'unverified@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      const res = await request(server)
        .post('/api/inquiries')
        .set('Authorization', `Bearer ${unverifiedRes.body.data.accessToken}`)
        .send({
          propertyId,
          subject: 'Test inquiry',
          initialMessage: 'Test message'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('verified');

      // Cleanup
      await User.deleteOne({ email: 'unverified@test.com' });
    });

    it('should fail with invalid property', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(server)
        .post('/api/inquiries')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          propertyId: fakeId,
          subject: 'Test inquiry',
          initialMessage: 'Test message'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/inquiries/my - Get User Inquiries', () => {
    it('should get user own inquiries', async () => {
      const res = await request(server)
        .get('/api/inquiries/my')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].propertyId).toBeDefined();
    });
  });

  describe('GET /api/inquiries/property/:propertyId - Get Property Inquiries', () => {
    it('should get inquiries for landlord property', async () => {
      const res = await request(server)
        .get(`/api/inquiries/property/${propertyId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].userId).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(server)
        .get(`/api/inquiries/property/${propertyId}?status=open`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((inquiry: any) => {
        expect(inquiry.status).toBe('open');
      });
    });

    it('should fail for non-landlord user', async () => {
      const res = await request(server)
        .get(`/api/inquiries/property/${propertyId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/inquiries/:id - Get Inquiry Detail', () => {
    it('should get inquiry detail with conversation', async () => {
      const res = await request(server)
        .get(`/api/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(inquiryId);
      expect(res.body.data.conversationId).toBeDefined();
      expect(res.body.data.propertyId).toBeDefined();
    });

    it('should allow landlord to view inquiry', async () => {
      const res = await request(server)
        .get(`/api/inquiries/${inquiryId}`)
        .set('Authorization', `Bearer ${landlordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(inquiryId);
    });
  });

  describe('POST /api/messages/conversation/:id/messages - Send Message', () => {
    it('should send message from landlord', async () => {
      const res = await request(server)
        .post(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({
          content: 'Yes, the unit is still available. Would you like to schedule a visit?'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.content).toContain('still available');

      // Verify notification created for user
      const notification = await Notification.findOne({
        userId,
        type: 'message'
      });
      expect(notification).toBeDefined();

      // Verify inquiry status changed to in_progress
      const inquiry = await Inquiry.findById(inquiryId);
      expect(inquiry!.status).toBe('in_progress');
    });

    it('should send message from user', async () => {
      const res = await request(server)
        .post(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Yes, I would like to schedule a visit this weekend.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toContain('schedule a visit');
    });

    it('should support attachments', async () => {
      const res = await request(server)
        .post(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Here are my documents',
          attachments: ['https://example.com/doc1.pdf', 'https://example.com/doc2.pdf']
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attachments).toHaveLength(2);
    });

    it('should fail for non-participant', async () => {
      // Create another user
      const otherRes = await request(server)
        .post('/api/auth/register')
        .send({
          name: 'Other User',
          email: 'other@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      const res = await request(server)
        .post(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${otherRes.body.data.accessToken}`)
        .send({
          content: 'Trying to send message'
        });

      expect(res.status).toBe(403);

      // Cleanup
      await User.deleteOne({ email: 'other@test.com' });
    });
  });

  describe('GET /api/messages/conversation/:id/messages - Get Messages', () => {
    it('should get conversation messages', async () => {
      const res = await request(server)
        .get(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should mark messages as read', async () => {
      // Get messages as user
      await request(server)
        .get(`/api/messages/conversation/${conversationId}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      // Check that landlord messages are marked as read by user
      const messages = await Message.find({
        conversationId,
        senderId: landlordId
      });

      messages.forEach(msg => {
        expect(msg.readBy.map(id => id.toString())).toContain(userId);
      });
    });

    it('should support pagination', async () => {
      const res = await request(server)
        .get(`/api/messages/conversation/${conversationId}/messages?page=1&limit=2`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  describe('PATCH /api/inquiries/:id/status - Update Inquiry Status', () => {
    it('should update inquiry status by landlord', async () => {
      const res = await request(server)
        .patch(`/api/inquiries/${inquiryId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'converted' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('converted');

      // Verify notification created for user
      const notification = await Notification.findOne({
        userId,
        type: 'inquiry',
        title: 'Inquiry Converted'
      });
      expect(notification).toBeDefined();
    });

    it('should fail for user (not landlord)', async () => {
      const res = await request(server)
        .patch(`/api/inquiries/${inquiryId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(403);
    });

    it('should fail with invalid status', async () => {
      const res = await request(server)
        .patch(`/api/inquiries/${inquiryId}/status`)
        .set('Authorization', `Bearer ${landlordToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });
  });
});
