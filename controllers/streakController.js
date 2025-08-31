const { loadStreakData, saveStreakData, saveLastActivity, getLastActivity } = require('../config/storage');
const stravaApi = require('../services/stravaApi');
const { formatDate } = require('../utils/formatters');
const { updateStatsWithRun } = require('./statsController');
const { generateDescription } = require('../utils/descriptionGenerator');

async function updateRunStreak(activity = null) {
  try {
    const streakData = await loadStreakData();
    const today = new Date();
    const todayDate = today.toDateString();
    
    // Get the last activity date from storage
    const lastActivity = await getLastActivity();
    const lastRunDate = lastActivity.date ? new Date(lastActivity.date).toDateString() : null;
    
    // If an activity is provided, use its date
    const currentActivityDate = activity ? new Date(activity.start_date).toDateString() : todayDate;
    
    // Check if we already processed today's run
    if (lastRunDate === currentActivityDate && activity && activity.type === 'Run') {
      return { message: "Already processed a run today", ...streakData };
    }
    
    // Get activities from the last 2 days to check for consecutive runs
    const activities = await stravaApi.getRecentActivities(2);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toDateString();
    
    const yesterdayFormatted = formatDate(yesterday);
    const yesterdaysRuns = activities.filter(a => 
      a.type === 'Run' && formatDate(new Date(a.start_date)) === yesterdayFormatted
    );

    let newRunProcessed = false;

    if (activity && activity.type === 'Run') {
      await updateStatsWithRun(activity);
      
      // Only increase totals if this is a new run that hasn't been processed
      if (!streakData.manuallyUpdated && currentActivityDate !== lastRunDate) {
        streakData.totalRuns += 1;
        streakData.totalDistance += activity.distance;
        streakData.totalTime += activity.moving_time || activity.elapsed_time || 0;
        streakData.totalElevation += activity.total_elevation_gain || 0;
        newRunProcessed = true;
      }
    }

    // Check for consecutive days using streakData.lastRunDate (not lastActivity.date)
    const hadRunYesterday = yesterdaysRuns.length > 0;
    const lastRunDateObj = streakData.lastRunDate ? new Date(streakData.lastRunDate) : null;
    
    // Calculate days since last run - USE streakData.lastRunDate for streak calculations
    let daysSinceLastRun = Infinity;
    if (lastRunDateObj) {
      const timeDiff = today.getTime() - lastRunDateObj.getTime();
      daysSinceLastRun = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    // Update streak logic only if a new run was processed
    if (!streakData.manuallyUpdated && newRunProcessed) {
      if (hadRunYesterday || daysSinceLastRun === 1) {
        // Continue the streak
        streakData.currentStreak += 1;
      } else if (daysSinceLastRun > 1) {
        // Gap in running - reset streak to 1
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      } else if (!streakData.lastRunDate) {
        // First run ever
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
      
      // Update lastRunDate to today when a new run is processed
      streakData.lastRunDate = currentActivityDate;
    }

    // Update longest streak if needed
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    // Save updated data
    await saveStreakData(streakData);

    // Save this as the last processed activity if it's a run
    if (activity && activity.type === 'Run') {
      await saveLastActivity({
        id: activity.id,
        date: activity.start_date,
        type: activity.type,
        distance: activity.distance
      });
    }

    return { 
      message: newRunProcessed ? "Streak updated successfully with new run" : "No new runs processed",
      newRunProcessed: newRunProcessed,
      hadRunYesterday: hadRunYesterday,
      daysSinceLastRun: daysSinceLastRun,
      ...streakData
    };

  } catch (error) {
    console.error('Error updating streak:', error.message);
    throw error;
  }
}

async function manuallyUpdateStreak(updates) {
  try {
    const streakData = await loadStreakData();
    
    // Update only the provided fields, converting km to meters for distance
    Object.keys(updates).forEach(key => {
      if (streakData.hasOwnProperty(key)) {
        if (key === 'manuallyUpdated') {
          streakData[key] = updates[key] === 'true';
        } else if (key === 'totalDistance') {
          // Convert km to meters for distance
          streakData[key] = kmToMeters(updates[key]);
        } else if (typeof streakData[key] === 'number') {
          streakData[key] = parseFloat(updates[key]) || 0;
        } else {
          streakData[key] = updates[key];
        }
      }
    });
    
    streakData.manuallyUpdated = true;
    streakData.lastManualUpdate = new Date().toISOString();
    
    await saveStreakData(streakData);
    
    return { 
      success: true, 
      message: "Streak updated manually. Your exact values will be preserved.",
      data: streakData
    };
  } catch (error) {
    console.error('Error in manual streak update:', error.message);
    throw new Error('Failed to update streak: ' + error.message);
  }
}

async function getCurrentStreak() {
  try {
    const data = await loadStreakData();
    return data.currentStreak;
  } catch (error) {
    console.error('Error getting current streak:', error.message);
    throw new Error('Failed to load streak data');
  }
}

async function getAllStreakData() {
  try {
    return await loadStreakData();
  } catch (error) {
    console.error('Error getting all streak data:', error.message);
    throw new Error('Failed to load streak data');
  }
}

async function resetStreak() {
  try {
    const streakData = await loadStreakData();
    
    streakData.currentStreak = 0;
    streakData.longestStreak = 0;
    streakData.totalRuns = 0;
    streakData.totalDistance = 0;
    streakData.totalTime = 0;
    streakData.totalElevation = 0;
    streakData.streakStartDate = new Date().toISOString().split('T')[0];
    streakData.lastRunDate = null;
    streakData.manuallyUpdated = false;
    streakData.lastManualUpdate = new Date().toISOString();
    
    await saveStreakData(streakData);
    
    return { 
      success: true, 
      message: "Streak reset successfully",
      data: streakData
    };
  } catch (error) {
    console.error('Error resetting streak:', error.message);
    throw new Error('Failed to reset streak');
  }
}

// Helper function to convert km to meters
function kmToMeters(km) {
  return parseFloat(km) * 1000;
}

module.exports = {
  updateRunStreak,
  manuallyUpdateStreak,
  getCurrentStreak,
  getAllStreakData,
  resetStreak
};
