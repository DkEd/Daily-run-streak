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
        streakStats.totalElevation += activity.total_elevation_gain || 0;
        
        // Update monthly/yearly stats
        const activityMonth = new Date(activity.start_date).getMonth();
        const activityYear = new Date(activity.start_date).getFullYear();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        // Reset monthly stats if it's a new month
        if (activityMonth !== currentMonth || activityYear !== currentYear) {
          streakStats.monthlyDistance = 0;
          streakStats.monthlyElevation = 0;
        }
        
        // Reset yearly stats if it's a new year
        if (activityYear !== currentYear) {
          streakStats.yearlyDistance = 0;
          streakStats.yearlyElevation = 0;
        }
        
        // Add to monthly/yearly totals
        streakStats.monthlyDistance += activity.distance;
        streakStats.yearlyDistance += activity.distance;
        streakStats.monthlyElevation += activity.total_elevation_gain || 0;
        streakStats.yearlyElevation += activity.total_elevation_gain || 0;
        
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
    
    // Update provided fields
    Object.keys(updates).forEach(key => {
      if (streakStats.hasOwnProperty(key)) {
        if (key === 'manuallyUpdated') {
          streakStats[key] = updates[key] === 'true';
        } else if (key.includes('Distance') || key.includes('Goal')) {
          // Convert km to meters for distance fields
          streakStats[key] = parseFloat(updates[key]) * 1000;
        } else if (typeof streakStats[key] === 'number') {
          streakStats[key] = parseFloat(updates[key]) || 0;
        } else {
          streakStats[key] = updates[key];
        }
      }
    });
    
    streakStats.manuallyUpdated = true;
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
