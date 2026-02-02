const config = require('../config/environment');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default values
  statusCode = statusCode || 500;
  message = message || 'Internal Server Error';

  // Log error in development
  if (config.nodeEnv === 'development') {
    console.error('Error:', err);
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    status: err.status || 'error',
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
