import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

dotenv.config();

// Connect Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Chain
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'RentDito API is active' });
});

// Route Mount Placeholders (to be implemented)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/team', teamRoutes);
// app.use('/api/properties', propertyRoutes);
// app.use('/api/units', unitRoutes);
// app.use('/api/tenants', tenantRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/contracts', contractRoutes);
// app.use('/api/billing', billingRoutes);
// app.use('/api/payments', paymentRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/maintenance', maintenanceRoutes);
// app.use('/api/dashboard', dashboardRoutes);
// app.use('/api/reports', reportRoutes);
// app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
});
