import mongoose from 'mongoose';

export const connectDB = async () => {
  const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/rentdito';
  try {
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${(error as Error).message}`);
    // Implement retry logic
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};
