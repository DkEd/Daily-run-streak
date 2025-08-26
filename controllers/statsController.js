const { loadStatsData, saveStatsData } = require('../config/storage');
const { formatDate } = require('../utils/formatters');

async function updateStatsWithRun(activity) {
  if (activity.type === 'Run') {
    try {
      const stats = await loadStatsData();
      const activityDate = new Date(activity.start_date);
      const now = new Date();
      
      // Reset monthly stats if it's a new month
      if (stats.lastUpdated) {
        const lastUpdated = new Date(stats.lastUpdated);
        if (lastUpdated.getMonth() !== now.getMonth() || 
            lastUpdated.getFullYear() !== now.getFullYear()) {
          stats.monthlyDistance = 0;
          stats.monthlyTime = 0;
          stats.monthlyElevation = 0;
        }
        
        // Reset yearly stats if it's a new year
        if (lastUpdated.getFullYear() !== now.getFullYear()) {
          stats.yearlyDistance = 0;
          stats.yearlyTime = 0;
          stats.yearlyElevation = 0;
        }
      }

      // Update stats with activity data
      stats.monthlyDistance += activity.distance / 1000;
      stats.yearlyDistance += activity.distance / 1000;
      stats.monthlyTime += activity.moving_time || activity.elapsed_time || 0;
      stats.yearlyTime += activity.moving_time || activity.elapsed_time || 0;
      stats.monthlyElevation += activity.total_elevation_gain || 0;
      stats.yearlyElevation += activity.total_elevation_gain || 0;
      stats.lastUpdated = now.toISOString();

      await saveStatsData(stats);
      return stats;
    } catch (error) {
      console.error('Error updating stats with run:', error.message);
      throw new Error('Failed to update stats with run data');
    }
  }
  return null;
}

async function manuallyUpdateStats(updates) {
  try {
    const stats = await loadStatsData();
    
    // Update only the provided fields
    Object.keys(updates).forEach(key => {
      if (stats.hasOwnProperty(key)) {
        stats[key] = parseFloat(updates[key]) || updates[key];
      }
    });
    
    stats.lastUpdated = new Date().toISOString();
    await saveStatsData(stats);
    
    return { success: true, message: "Stats updated manually", data: stats };
  } catch (error) {
    console.error('Error in manual stats update:', error.message);
    throw new Error('Failed to update stats: ' + error.message);
  }
}

async function getAllStats() {
  try {
    return await loadStatsData();
  } catch (error) {
    console.error('Error getting all stats:', error.message);
    throw new Error('Failed to load stats data');
  }
}

async function resetMonthlyStats() {
  try {
    const stats = await loadStatsData();
    
    stats.monthlyDistance = 0;
    stats.monthlyTime = 0;
    stats.monthlyElevation = 0;
    stats.lastUpdated = new Date().toISOString();
    
    await saveStatsData(stats);
    
    return { success: true, message: "Monthly stats reset", data: stats };
  } catch (error) {
    console.error('Error resetting monthly stats:', error.message);
    throw new Error('Failed to reset monthly stats');
  }
}

async function resetYearlyStats() {
  try {
    const stats = await loadStatsData();
    
    stats.yearlyDistance = 0;
    stats.yearlyTime = 0;
    stats.yearlyElevation = 0;
    stats.lastUpdated = new Date().toISOString();
    
    await saveStatsData(stats);
    
    return { success: true, message: "Yearly stats reset", data: stats };
  } catch (error) {
    console.error('Error resetting yearly stats:', error.message);
    throw new Error('Failed to reset yearly stats');
  }
}

module.exports = {
  updateStatsWithRun,
  manuallyUpdateStats,
  getAllStats,
  resetMonthlyStats,
  resetYearlyStats
};
