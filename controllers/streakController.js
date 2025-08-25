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
    
    const todaysRun = activities.find(activity => 
      activity.type === 'Run' && 
      activity.distance >= 4500 &&
      formatDate(new Date(activity.start_date)) === today
    );

    const todaysRuns = activities.filter(activity => 
      activity.type === 'Run' && 
      formatDate(new Date(activity.start_date)) === today
    );
    
    for (const run of todaysRuns) {
      await updateStatsWithRun(run);
    }

    if (!todaysRun) {
      return { message: "No qualifying run today (>4500m)", ...streakData };
    }
    
    if (streakData.lastRunDate === todayDate) {
      return { message: "Already processed today's run", ...streakData };
    }

    if (!streakData.manuallyUpdated) {
      streakData.totalRuns += 1;
      streakData.totalDistance += todaysRun.distance;
      streakData.totalTime += todaysRun.moving_time || 0;
      streakData.totalElevation += todaysRun.total_elevation_gain || 0;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streakData.lastRunDate = yesterday.toDateString();

    if (!streakData.manuallyUpdated) {
      if (streakData.lastRunDate === yesterday.toDateString()) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
    }

    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    await saveStreakData(streakData);

    const description = await generateDescription(streakData, todaysRun.id);
    await stravaApi.updateActivityDescription(todaysRun.id, description);

    return { 
      message: "Streak updated successfully", 
      ...streakData, 
      newDescription: description 
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
