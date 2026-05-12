import express from 'express';
import cors from 'cors';
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
import billingRoutes from './routes/billing.routes';
import paymentRoutes from './routes/payment.routes';
import utilityRoutes from './routes/utility.routes';
import inventoryRoutes from './routes/inventory.routes';
import ticketRoutes from './routes/ticket.routes';
import transferRoutes from './routes/transfer.routes';
import financialRoutes from './routes/financial.routes';
import { initScheduler } from './services/scheduler.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware chain
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve locally-uploaded files (fallback when Cloudinary is unavailable)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Database connection
connectDB();

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'RentDito API is active' });
});

// Route mounts
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
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/utilities', utilityRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/financials', financialRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);

  // Initialize cron scheduler (gated by ENABLE_CRON=true)
  initScheduler();
});

export default server;
