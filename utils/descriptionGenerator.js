const stravaApi = require('../services/stravaApi');
const { formatTime, generateProgressBars, cleanExistingDescription } = require('./formatters');
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
👀 @DailyRunGuy`;

    if (existingDescription) {
      return `${streakSection}\n\n${existingDescription}`;
    }
    
    return streakSection;
  } catch (error) {
    console.error('Error generating description:', error);
    
    // Fallback description if stats can't be loaded
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
👀 @DailyRunGuy`;
  }
}

module.exports = {
  generateDescription
};
