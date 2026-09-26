import 'dotenv/config';

const envConfig = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  mongodbDbName: process.env.MONGODB_DB_NAME,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  adminSecret: process.env.ADMIN_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export default envConfig;
