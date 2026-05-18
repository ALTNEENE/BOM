import mongoose from 'mongoose';

let eventsRegistered = false;

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);

    if (!eventsRegistered) {
      eventsRegistered = true;

      mongoose.connection.on('error', (err) => {
        console.error(`MongoDB connection error: ${err}`);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      if (!process.env.VERCEL) {
        process.on('SIGINT', async () => {
          await mongoose.connection.close();
          console.log('MongoDB connection closed through app termination');
          process.exit(0);
        });
      }
    }

    return conn;
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);

    if (process.env.VERCEL || process.env.NODE_ENV === 'test') {
      throw error;
    }

    process.exit(1);
  }
};

export default connectDB;
