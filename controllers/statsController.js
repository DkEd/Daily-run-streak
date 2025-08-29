const { loadStatsData, saveStatsData } = require('../config/storage');
const { formatDate, kmToMeters, metersToKm } = require('../utils/formatters');

async function updateStatsWithRun(activity) {
  if (activity.type === 'Run') {
    try {
      console.log('Processing run activity:', {
        id: activity.id,
        distance: activity.distance,
        elevation: activity.total_elevation_gain,
        date: activity.start_date
      });
      
      const stats = await loadStatsData();
      const activityDate = new Date(activity.start_date);
      const now = new Date();
      
      // Check if stats were manually updated - if so, don't auto-update
      const lastUpdated = stats.lastUpdated ? new Date(stats.lastUpdated) : null;
      const isNewMonth = lastUpdated && (lastUpdated.getMonth() !== now.getMonth() || lastUpdated.getFullYear() !== now.getFullYear());
      const isNewYear = lastUpdated && lastUpdated.getFullYear() !== now.getFullYear();
      
      // Reset monthly stats if it's a new month and not manually maintained
      if (isNewMonth && !stats.manuallyUpdated) {
        stats.monthlyDistance = 0;
        stats.monthlyTime = 0;
        stats.monthlyElevation = 0;
      }
      
      // Reset yearly stats if it's a new year and not manually maintained
      if (isNewYear && !stats.manuallyUpdated) {
        stats.yearlyDistance = 0;
        stats.yearlyTime = 0;
        stats.yearlyElevation = 0;
      }

      // Only update stats if they're not manually maintained
      if (!stats.manuallyUpdated) {
        // Get elevation gain from activity (use 0 if not available)
        const elevationGain = activity.total_elevation_gain || 0;
        
        console.log('Updating stats with:', {
          distance: activity.distance,
          elevation: elevationGain,
          monthlyElevationBefore: stats.monthlyElevation,
          yearlyElevationBefore: stats.yearlyElevation
        });
        
        // Update stats with activity data
        stats.monthlyDistance += activity.distance;
        stats.yearlyDistance += activity.distance;
        stats.monthlyTime += activity.moving_time || activity.elapsed_time || 0;
        stats.yearlyTime += activity.moving_time || activity.elapsed_time || 0;
        
        // FIX: Only add elevation once, not twice
        stats.monthlyElevation += elevationGain;
        stats.yearlyElevation += elevationGain;
        
        console.log('Stats after update:', {
          monthlyElevationAfter: stats.monthlyElevation,
          yearlyElevationAfter: stats.yearlyElevation
        });
      }
      
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
    
    // Update only the provided fields, converting km to meters for distance fields
    Object.keys(updates).forEach(key => {
      if (stats.hasOwnProperty(key)) {
        // Convert km to meters for distance fields
        if (key.includes('Distance') || key.includes('Goal')) {
          stats[key] = kmToMeters(updates[key]);
        } else if (key.includes('Elevation')) {
          // Elevation should stay in meters (no conversion needed)
          stats[key] = parseFloat(updates[key]) || 0;
        } else {
          stats[key] = parseFloat(updates[key]) || updates[key];
        }
      }
    });
    
    // Mark as manually updated
    stats.manuallyUpdated = true;
    stats.lastUpdated = new Date().toISOString();
    await saveStatsData(stats);
    
    return { success: true, message: "Stats updated manually. Your values will be preserved.", data: stats };
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
    stats.manuallyUpdated = false;
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
    stats.manuallyUpdated = false;
    stats.lastUpdated = new Date().toISOString();
    
    await saveStatsData(stats);
    
    return { success: true, message: "Yearly stats reset", data: stats };
  } catch (error) {
    console.error('Error resetting yearly stats:', error.message);
    throw new Error('Failed to reset yearly stats');
  }
}

async function toggleManualMode() {
  try {
    const stats = await loadStatsData();
    stats.manuallyUpdated = !stats.manuallyUpdated;
    stats.lastUpdated = new Date().toISOString();
    
    await saveStatsData(stats);
    
    return { 
      success: true, 
      message: `Stats are now ${stats.manuallyUpdated ? 'manually' : 'automatically'} updated`,
      data: stats 
    };
  } catch (error) {
    console.error('Error toggling manual mode:', error.message);
    throw new Error('Failed to toggle manual mode');
  }
}

module.exports = {
  updateStatsWithRun,
  manuallyUpdateStats,
  getAllStats,
  resetMonthlyStats,
  resetYearlyStats,
  toggleManualMode
};
