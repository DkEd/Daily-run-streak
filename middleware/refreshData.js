const { loadStreakData, loadStatsData, healthCheck } = require('../config/storage');

async function refreshDataMiddleware(req, res, next) {
  try {
    // Check Redis health first
    const redisHealthy = await healthCheck();
    
    if (!redisHealthy) {
      console.error('Redis is not healthy, skipping data refresh');
      return next();
    }
    
    console.log('Refreshing data from Redis before processing request...');
    
    // Force reload from Redis
    await loadStreakData();
    await loadStatsData();
    
    next();
  } catch (error) {
    console.error('Error refreshing data:', error.message);
    next(); // Continue even if refresh fails
  }
}

module.exports = refreshDataMiddleware;
