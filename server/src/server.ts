import express from 'express';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import landlordApplicationRoutes from './routes/landlord-application.routes';
import teamRoutes from './routes/team.routes';
import propertyRoutes from './routes/property.routes';
import unitRoutes from './routes/unit.routes';
import publicRoutes from './routes/public.routes';
import adminRoutes from './routes/admin.routes';
import inquiryRoutes from './routes/inquiry.routes';
import messageRoutes from './routes/message.routes';
import visitRoutes from './routes/visit.routes';
import applicationRoutes from './routes/application.routes';
import contractRoutes from './routes/contract.routes';
import tenancyRoutes from './routes/tenancy.routes';
import reportRoutes from './routes/report.routes';
import documentRoutes from './routes/document.routes';
import securityRoutes from './routes/security.routes';
import notificationRoutes from './routes/notification.routes';
import { auditLog } from './middleware/auditLog';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware chain
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

// Serve locally-uploaded files (fallback when Cloudinary is unavailable)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Database connection
connectDB();

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'RentDito API is active' });
});

// Route mounts
app.use(auditLog); // Attach audit log middleware before routes (it listens to res.on('finish'))
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/landlord-applications', landlordApplicationRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/notifications', notificationRoutes);

// Global error handler — must be registered after all routes
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
});

export default server;
