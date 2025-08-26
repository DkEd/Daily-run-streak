const { loadStreakData, saveStreakData } = require('../config/storage');
const stravaApi = require('../services/stravaApi');
const { formatDate } = require('../utils/formatters');
const { updateStatsWithRun } = require('./statsController');
const { generateDescription } = require('../utils/descriptionGenerator');

async function updateRunStreak() {
  try {
    const streakData = await loadStreakData();
    const todayDate = new Date().toDateString();
    
    const activities = await stravaApi.getRecentActivities(2);
    const today = formatDate(new Date());
    
    // Find ALL of today's runs (not just qualifying ones)
    const todaysRuns = activities.filter(activity => 
      activity.type === 'Run' && 
      formatDate(new Date(activity.start_date)) === today
    );

    if (todaysRuns.length === 0) {
      return { message: "No runs today", ...streakData };
    }
    
    // Update stats with ALL runs from today
    for (const run of todaysRuns) {
      await updateStatsWithRun(run);
    }

    // Check if we already processed today
    if (streakData.lastRunDate === todayDate) {
      return { message: "Already processed today's run", ...streakData };
    }

    // Find the longest run of the day (for streak purposes)
    const longestRun = todaysRuns.reduce((longest, current) => 
      current.distance > longest.distance ? current : longest, todaysRuns[0]);
    
    const isQualifyingRun = longestRun.distance >= 4500;

    // DON'T update totals if manually updated - use exact manual values
    if (!streakData.manuallyUpdated && isQualifyingRun) {
      // Only update if NOT manually updated AND it's a qualifying run
      streakData.totalRuns += 1;
      streakData.totalDistance += longestRun.distance;
      streakData.totalTime += longestRun.moving_time || 0;
      streakData.totalElevation += longestRun.total_elevation_gain || 0;
    }

    // Set lastRunDate to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streakData.lastRunDate = yesterday.toDateString();

    // Keep the manually set streak count, only update if not manually set
    if (!streakData.manuallyUpdated && isQualifyingRun) {
      if (streakData.lastRunDate === yesterday.toDateString()) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
    }

    // Update longest streak if needed
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    // Save updated data
    await saveStreakData(streakData);

    // Generate description for ALL runs (not just qualifying ones)
    for (const run of todaysRuns) {
      const description = await generateDescription(streakData, run.id);
      await stravaApi.updateActivityDescription(run.id, description);
    }

    return { 
      message: isQualifyingRun 
        ? "Streak updated successfully" 
        : "Stats updated (run <4500m, streak not updated)",
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
    
    // Update only the provided fields
    Object.keys(updates).forEach(key => {
      if (streakData.hasOwnProperty(key)) {
        if (key === 'manuallyUpdated') {
          streakData[key] = updates[key] === 'true';
        } else if (typeof streakData[key] === 'number') {
          streakData[key] = parseFloat(updates[key]) || 0;
        } else {
          streakData[key] = updates[key];
        }
      }
    });
    
    streakData.manuallyUpdated = true;
    streakData.lastManualUpdate = new Date().toISOString();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streakData.lastRunDate = yesterday.toDateString();
    
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

module.exports = {
  updateRunStreak,
  manuallyUpdateStreak,
  getCurrentStreak,
  getAllStreakData,
  resetStreak
};
