import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware chain
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Database connection
connectDB();

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'RentDito API is active' });
});

// Route mount placeholders
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/properties', propertyRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server is running in development mode on port ${PORT}`);
});

export default server;
