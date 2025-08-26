const { loadStreakData, loadStatsData } = require('../config/storage');

async function refreshDataMiddleware(req, res, next) {
  try {
    // Force reload data from cloud before processing any request
    console.log('Refreshing data from cloud storage...');
    
    // Clear any cached data by reloading from cloud
    await loadStreakData(true); // Pass true to force cloud refresh
    await loadStatsData(true);  // Pass true to force cloud refresh
    
    next();
  } catch (error) {
    console.error('Error refreshing data:', error);
    next(); // Continue even if refresh fails
  }
}

module.exports = refreshDataMiddleware;
