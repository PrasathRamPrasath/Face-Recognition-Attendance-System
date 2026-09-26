import app from './src/app.js';
import connectDB from './src/config/database.js';
import envConfig from './src/config/envConfig.js';

connectDB();

const server = app.listen(envConfig.port, () => {
  console.log(`Server running in ${envConfig.nodeEnv} mode on port ${envConfig.port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
