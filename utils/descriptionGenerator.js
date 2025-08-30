const stravaApi = require('../services/stravaApi');
const { formatTime, generateProgressBars, cleanExistingDescription, metersToKm } = require('./formatters');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    // Always show streak section for runs
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m`;
    const statsSection = `
Monthly: ${metersToKm(stats.monthlyDistance)}/${metersToKm(stats.monthlyGoal)} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${metersToKm(stats.yearlyDistance)}/${metersToKm(stats.yearlyGoal)} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
📷 @DailyRunGuy`;

    const fullDescription = `${streakSection}\n${statsSection}`;

    if (existingDescription) {
      return `${fullDescription}\n\n${existingDescription}`;
    }
    
    return fullDescription;
  } catch (error) {
    console.error('Error generating description:', error.message);
    
    // Fallback description
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
📷 @DailyRunGuy`;
  }
}

module.exports = {
  generateDescription
};
