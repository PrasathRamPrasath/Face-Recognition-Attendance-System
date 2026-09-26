import mongoose from 'mongoose';
import envConfig from './envConfig.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(envConfig.mongodbUri, {
      dbName: envConfig.mongodbDbName,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
