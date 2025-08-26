const stravaApi = require('../services/stravaApi');
const { formatTime, generateProgressBars, cleanExistingDescription, metersToKm } = require('./formatters');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${metersToKm(stats.monthlyDistance)}/${metersToKm(stats.monthlyGoal)} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${metersToKm(stats.yearlyDistance)}/${metersToKm(stats.yearlyGoal)} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
📷 @DailyRunGuy`;

    if (existingDescription) {
      return `${streakSection}\n\n${existingDescription}`;
    }
    
    return streakSection;
  } catch (error) {
    console.error('Error generating description:', error.message);
    
    // Fallback description if stats can't be loaded
    const stats = await loadStatsData().catch(() => null);
    
    if (stats) {
      return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${metersToKm(stats.monthlyDistance)}/${metersToKm(stats.monthlyGoal)} km
Yearly: ${metersToKm(stats.yearlyDistance)}/${metersToKm(stats.yearlyGoal)} km
📷 @DailyRunGuy`;
    } else {
      return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
📷 @DailyRunGuy`;
    }
  }
}

module.exports = {
  generateDescription
};
