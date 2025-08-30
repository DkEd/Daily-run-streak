const stravaApi = require('../services/stravaApi');
const { formatTime, generateProgressBars, cleanExistingDescription, metersToKm } = require('./formatters');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    // Check if goals are over 100% for 🎉 emoji
    const monthlyGoalPercent = (stats.monthlyDistance / stats.monthlyGoal) * 100;
    const yearlyGoalPercent = (stats.yearlyDistance / stats.yearlyGoal) * 100;
    
    const monthlyCelebration = monthlyGoalPercent >= 100 ? ' 🎉' : '';
    const yearlyCelebration = yearlyGoalPercent >= 100 ? ' 🎉' : '';
    
    // Always show streak section for runs - REMOVED line space between streak and monthly
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${metersToKm(stats.monthlyDistance)}/${metersToKm(stats.monthlyGoal)} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}${monthlyCelebration}
Yearly: ${metersToKm(stats.yearlyDistance)}/${metersToKm(stats.yearlyGoal)} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}${yearlyCelebration}
📷 @DailyRunGuy`;

    if (existingDescription) {
      return `${streakSection}\n\n${existingDescription}`;
    }
    
    return streakSection;
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
