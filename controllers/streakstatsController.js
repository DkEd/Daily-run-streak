const { loadStreakStats, saveStreakStats, saveLastActivity } = require('../config/storage');
const stravaApi = require('../services/stravaApi');
const { generateDescription } = require('../utils/descriptionGenerator');

async function updateStreakStatsWithRun(activity) {
  try {
    const streakStats = await loadStreakStats();
    const today = new Date();
    const todayDate = today.toDateString();
    
    if (activity && activity.type === 'Run') {
      const activityDate = new Date(activity.start_date).toDateString();
      
      // Check if this is a new run (different date than last run)
      const lastRunDate = streakStats.lastRunDate ? new Date(streakStats.lastRunDate).toDateString() : null;
      const isNewRun = activityDate !== lastRunDate;
      
      if (isNewRun && !streakStats.manuallyUpdated) {
        // Update totals
        streakStats.totalRuns += 1;
        streakStats.totalDistance += activity.distance;
        streakStats.totalTime += activity.moving_time || activity.elapsed_time || 0;
        streakStats.totalElevation += activity.total_elevation_gain || 0;
        
        // Get current month/year for reset logic
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const activityDateObj = new Date(activity.start_date);
        const activityMonth = activityDateObj.getMonth();
        const activityYear = activityDateObj.getFullYear();
        
        console.log('DEBUG: Date check - Current:', {
          month: currentMonth + 1,
          year: currentYear
        }, 'Activity:', {
          month: activityMonth + 1, 
          year: activityYear
        });
        
        // Reset monthly stats if it's a new month AND the activity is in the current month
        // Only reset if the activity is in the current month to avoid resetting when processing old activities
        if (activityMonth !== currentMonth || activityYear !== currentYear) {
          console.log('DEBUG: Activity is from different month/year, not resetting monthly stats');
        } else {
          // Check if we need to reset monthly stats (new month)
          const lastRunMonth = streakStats.lastRunDate ? new Date(streakStats.lastRunDate).getMonth() : null;
          const lastRunYear = streakStats.lastRunDate ? new Date(streakStats.lastRunDate).getFullYear() : null;
          
          if (lastRunMonth !== null && lastRunYear !== null && 
              (lastRunMonth !== currentMonth || lastRunYear !== currentYear)) {
            console.log('DEBUG: Resetting monthly stats for new month');
            streakStats.monthlyDistance = 0;
            streakStats.monthlyElevation = 0;
          }
        }
        
        // Reset yearly stats if it's a new year AND the activity is in the current year
        if (activityYear !== currentYear) {
          console.log('DEBUG: Activity is from different year, not resetting yearly stats');
        } else {
          // Check if we need to reset yearly stats (new year)
          const lastRunYear = streakStats.lastRunDate ? new Date(streakStats.lastRunDate).getFullYear() : null;
          
          if (lastRunYear !== null && lastRunYear !== currentYear) {
            console.log('DEBUG: Resetting yearly stats for new year');
            streakStats.yearlyDistance = 0;
            streakStats.yearlyElevation = 0;
          }
        }
        
        // Add to monthly/yearly totals (only if activity is in current period)
        if (activityMonth === currentMonth && activityYear === currentYear) {
          streakStats.monthlyDistance += activity.distance;
          streakStats.monthlyElevation += activity.total_elevation_gain || 0;
          console.log('DEBUG: Added to monthly - Distance:', activity.distance, 'Elevation:', activity.total_elevation_gain || 0);
        }
        
        if (activityYear === currentYear) {
          streakStats.yearlyDistance += activity.distance;
          streakStats.yearlyElevation += activity.total_elevation_gain || 0;
          console.log('DEBUG: Added to yearly - Distance:', activity.distance, 'Elevation:', activity.total_elevation_gain || 0);
        }
        
        // Update streak logic
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayDate = yesterday.toDateString();
        
        // Check for consecutive days
        if (lastRunDate === yesterdayDate) {
          // Continue streak
          streakStats.currentStreak += 1;
        } else if (lastRunDate && lastRunDate !== todayDate) {
          // Broken streak - reset to 1
          streakStats.currentStreak = 1;
          streakStats.streakStartDate = todayDate;
        } else if (!lastRunDate) {
          // First run
          streakStats.currentStreak = 1;
          streakStats.streakStartDate = todayDate;
        }
        
        // Update longest streak
        if (streakStats.currentStreak > streakStats.longestStreak) {
          streakStats.longestStreak = streakStats.currentStreak;
        }
        
        // Update last run date
        streakStats.lastRunDate = activityDate;
      }
    }
    
    await saveStreakStats(streakStats);
    return streakStats;
    
  } catch (error) {
    console.error('Error updating streakstats with run:', error.message);
    throw error;
  }
}

async function manuallyUpdateStreakStats(updates) {
  try {
    const streakStats = await loadStreakStats();
    
    console.log('DEBUG: Manual update received:', updates);
    
    // Update provided fields
    Object.keys(updates).forEach(key => {
      if (streakStats.hasOwnProperty(key)) {
        if (key === 'manuallyUpdated') {
          streakStats[key] = updates[key] === 'true';
          console.log('DEBUG: Set manuallyUpdated to:', streakStats[key]);
        } else if (key.includes('Distance') || key.includes('Goal')) {
          // Convert km to meters for distance fields
          streakStats[key] = parseFloat(updates[key]) * 1000;
          console.log('DEBUG: Set', key, 'to:', streakStats[key], 'meters');
        } else if (key === 'totalTime') {
          // Handle total time (already in seconds) - FIXED: Ensure proper parsing
          const timeValue = parseInt(updates[key]) || 0;
          streakStats[key] = timeValue;
          console.log('DEBUG: Set totalTime to:', streakStats[key], 'seconds');
        } else if (typeof streakStats[key] === 'number') {
          streakStats[key] = parseFloat(updates[key]) || 0;
          console.log('DEBUG: Set', key, 'to:', streakStats[key]);
        } else {
          streakStats[key] = updates[key];
          console.log('DEBUG: Set', key, 'to:', streakStats[key]);
        }
      } else {
        console.log('DEBUG: Field not found in streakStats:', key);
      }
    });
    
    // Double-check that totalTime was set correctly
    if (updates.totalTime && !streakStats.totalTime) {
      console.log('DEBUG: totalTime was not set properly, forcing update');
      streakStats.totalTime = parseInt(updates.totalTime) || 0;
    }
    
    streakStats.manuallyUpdated = true;
    streakStats.lastUpdated = new Date().toISOString();
    
    console.log('DEBUG: Final streakstats before save - totalTime:', streakStats.totalTime);
    await saveStreakStats(streakStats);
    
    return { success: true, data: streakStats };
  } catch (error) {
    console.error('Error in manual streakstats update:', error.message);
    throw new Error('Failed to update streakstats: ' + error.message);
  }
}

async function pushToStravaDescription(activityId = null) {
  try {
    const streakStats = await loadStreakStats();
    
    // If no activity ID provided, get the most recent one
    let activity;
    if (!activityId) {
      const activities = await stravaApi.getRecentActivities(1);
      activity = activities[0];
    } else {
      activity = await stravaApi.getActivity(activityId);
    }
    
    if (activity && activity.type === 'Run') {
      const description = await generateDescription(streakStats, activity.id);
      await stravaApi.updateActivityDescription(activity.id, description);
      
      // Update last activity
      await saveLastActivity({
        id: activity.id,
        date: activity.start_date,
        type: activity.type,
        distance: activity.distance
      });
      
      return { success: true, activityId: activity.id };
    }
    
    return { success: false, message: 'No run activity found' };
  } catch (error) {
    console.error('Error pushing to Strava description:', error.message);
    throw error;
  }
}

module.exports = {
  updateStreakStatsWithRun,
  manuallyUpdateStreakStats,
  pushToStravaDescription,
  loadStreakStats
};
