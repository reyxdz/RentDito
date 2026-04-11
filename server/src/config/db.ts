import mongoose from 'mongoose';

const connectDB = async () => {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/rentdito';
            if (!uri) throw new Error('MONGO_URI is not defined in env');
            
            const conn = await mongoose.connect(uri);
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error: any) {
            retries++;
            console.error(`MongoDB connection attempt ${retries} failed:`, error.message);
            if (retries >= maxRetries) {
                console.error('Max retries reached. Exiting...');
                process.exit(1);
            }
            // Wait 5 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
        process.exit(1);
    }
});

export default connectDB;
