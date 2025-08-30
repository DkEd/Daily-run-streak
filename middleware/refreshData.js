const { healthCheck } = require('../config/storage');

async function refreshDataMiddleware(req, res, next) {
  try {
    // Just check Redis health for monitoring
    await healthCheck();
    next();
  } catch (error) {
    console.error('Redis health check failed:', error.message);
    next(); // Continue anyway
  }
}

module.exports = refreshDataMiddleware;
