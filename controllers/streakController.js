const { loadStreakData, saveStreakData } = require('../config/storage');
const stravaApi = require('../services/stravaApi');
const { formatDate, formatTime, generateProgressBars, cleanExistingDescription } = require('../utils/formatters');
const { updateStatsWithRun } = require('./statsController');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
📷 @DailyRunGuy`;

    if (existingDescription) {
      return `${streakSection}\n\n${existingDescription}`;
    }
    
    return streakSection;
  } catch (error) {
    console.error('Error generating description:', error);
    const stats = await loadStatsData();
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
📷 @DailyRunGuy`;
  }
}

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
    console.error('Error updating streak:', error);
    throw error;
  }
}

async function manuallyUpdateStreak(newStreakCount, newLongestStreak, newTotalRuns, newTotalDistance, newTotalTime, newTotalElevation, newStreakStartDate) {
  const streakData = await loadStreakData();
  
  streakData.currentStreak = parseInt(newStreakCount);
  streakData.longestStreak = parseInt(newLongestStreak);
  streakData.totalRuns = parseInt(newTotalRuns);
  streakData.totalDistance = parseFloat(newTotalDistance);
  streakData.totalTime = parseFloat(newTotalTime);
  streakData.totalElevation = parseFloat(newTotalElevation);
  streakData.streakStartDate = newStreakStartDate;
  streakData.manuallyUpdated = true;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  streakData.lastRunDate = yesterday.toDateString();
  
  streakData.lastManualUpdate = new Date().toDateString();
  
  await saveStreakData(streakData);
  
  return { 
    success: true, 
    message: "Streak updated manually. Your exact values will be preserved." 
  };
}

async function getCurrentStreak() {
  const data = await loadStreakData();
  return data.currentStreak;
}

async function getAllStreakData() {
  return await loadStreakData();
}

module.exports = {
  updateRunStreak,
  manuallyUpdateStreak,
  getCurrentStreak,
  getAllStreakData
};
