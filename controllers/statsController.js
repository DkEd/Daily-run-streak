const { loadStatsData, saveStatsData } = require('../config/storage');

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
          stats.monthlyDistance = 0.00;
          stats.monthlyTime = 0;
          stats.monthlyElevation = 0;
        }
        
        // Reset yearly stats if it's a new year
        if (lastUpdated.getFullYear() !== now.getFullYear()) {
          stats.yearlyDistance = 0.00;
          stats.yearlyTime = 0;
          stats.yearlyElevation = 0;
        }
      }

      // Convert activity distance from meters to kilometers with 2 decimal places
      const activityDistanceKm = parseFloat((activity.distance / 1000).toFixed(2));
      const activityElevation = activity.total_elevation_gain || 0;

      // Update stats with activity data (all in km)
      stats.monthlyDistance = parseFloat((stats.monthlyDistance + activityDistanceKm).toFixed(2));
      stats.yearlyDistance = parseFloat((stats.yearlyDistance + activityDistanceKm).toFixed(2));
      stats.monthlyTime += activity.moving_time || activity.elapsed_time || 0;
      stats.yearlyTime += activity.moving_time || activity.elapsed_time || 0;
      stats.monthlyElevation += activityElevation;
      stats.yearlyElevation += activityElevation;
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
        // Handle distance values (ensure they're floats with 2 decimals)
        if (key.includes('Distance') || key.includes('Goal')) {
          stats[key] = parseFloat(parseFloat(updates[key]).toFixed(2));
        } 
        // Handle elevation and time as normal numbers
        else if (key.includes('Elevation') || key.includes('Time')) {
          stats[key] = parseFloat(updates[key]) || 0;
        }
        // Handle other fields
        else {
          stats[key] = updates[key];
        }
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

// ... rest of the file remains the same
