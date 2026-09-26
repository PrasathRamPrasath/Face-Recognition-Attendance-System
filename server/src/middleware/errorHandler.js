import envConfig from '../config/envConfig.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message,
    stack: envConfig.nodeEnv === 'production' ? null : err.stack,
  });
};

export default errorHandler;
