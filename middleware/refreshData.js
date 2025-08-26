const { loadStreakData, loadStatsData } = require('../config/storage');

async function refreshDataMiddleware(req, res, next) {
  try {
    console.log('Refreshing data from cloud storage before processing request...');
    
    // Force reload from cloud by passing true to bypass cache
    await loadStreakData(true);
    await loadStatsData(true);
    
    next();
  } catch (error) {
    console.error('Error refreshing data:', error);
    next(); // Continue even if refresh fails
  }
}

module.exports = refreshDataMiddleware;
