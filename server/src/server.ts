import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'RentDito API is active' });
});

// Database connection & Server Boot
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rentdito';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running in development mode on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
