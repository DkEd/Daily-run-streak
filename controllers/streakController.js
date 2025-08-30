const { loadStreakData, saveStreakData } = require('../config/storage');
const stravaApi = require('../services/stravaApi');
const { formatDate } = require('../utils/formatters');
const { updateStatsWithRun } = require('./statsController');
const { generateDescription } = require('../utils/descriptionGenerator');

async function updateRunStreak() {
  try {
    const streakData = await loadStreakData();
    const today = new Date();
    const todayDate = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toDateString();
    
    // Get activities from the last 2 days to check for consecutive runs
    const activities = await stravaApi.getRecentActivities(2);
    const todayFormatted = formatDate(today);
    const yesterdayFormatted = formatDate(yesterday);
    
    // Find ALL runs from today and yesterday
    const todaysRuns = activities.filter(activity => 
      activity.type === 'Run' && 
      formatDate(new Date(activity.start_date)) === todayFormatted
    );

    const yesterdaysRuns = activities.filter(activity => 
      activity.type === 'Run' && 
      formatDate(new Date(activity.start_date)) === yesterdayFormatted
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

    // ALL runs count toward totals (not just qualifying ones)
    if (!streakData.manuallyUpdated) {
      for (const run of todaysRuns) {
        streakData.totalRuns += 1;
        streakData.totalDistance += run.distance;
        streakData.totalTime += run.moving_time || run.elapsed_time || 0;
        streakData.totalElevation += run.total_elevation_gain || 0;
      }
    }

    // Check for consecutive days - ANY run yesterday means consecutive
    const hadRunYesterday = yesterdaysRuns.length > 0;
    const lastRunDate = streakData.lastRunDate ? new Date(streakData.lastRunDate) : null;
    
    // Calculate days since last run
    let daysSinceLastRun = Infinity;
    if (lastRunDate) {
      const timeDiff = today.getTime() - lastRunDate.getTime();
      daysSinceLastRun = Math.floor(timeDiff / (1000 * 3600 * 24));
    }

    // Update streak logic - ALL runs count for consecutive days
    if (!streakData.manuallyUpdated) {
      if (hadRunYesterday || daysSinceLastRun === 1) {
        // Continue the streak (ran yesterday or exactly 1 day gap)
        streakData.currentStreak += 1;
      } else if (daysSinceLastRun > 1) {
        // Gap in running - reset streak to 1
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      } else if (!lastRunDate) {
        // First run ever
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
      // If daysSinceLastRun === 0, it's same day (already handled above)
    }

    // Update longest streak if needed
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    // Set lastRunDate to today
    streakData.lastRunDate = todayDate;

    // Save updated data
    await saveStreakData(streakData);

    // Generate description for ALL runs
    for (const run of todaysRuns) {
      const description = await generateDescription(streakData, run.id);
      await stravaApi.updateActivityDescription(run.id, description);
    }

    return { 
      message: `Streak updated successfully (${todaysRuns.length} runs today)`,
      runsToday: todaysRuns.length,
      hadRunYesterday: hadRunYesterday,
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
