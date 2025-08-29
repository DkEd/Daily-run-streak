const stravaApi = require('../services/stravaApi');
const { formatTime, generateProgressBars, cleanExistingDescription, metersToKm } = require('./formatters');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    // Check if streak should be displayed (only if run is from today or yesterday)
    const activityDate = new Date(activity.start_date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = activityDate.toDateString() === today.toDateString();
    const isYesterday = activityDate.toDateString() === yesterday.toDateString();
    
    let streakSection = '';
    
    // Only show streak if activity is from today or yesterday
    if (isToday || isYesterday) {
      streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${metersToKm(streakData.totalDistance)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m`;
    }
    
    const statsSection = `
Monthly: ${metersToKm(stats.monthlyDistance)}/${metersToKm(stats.monthlyGoal)} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${metersToKm(stats.yearlyDistance)}/${metersToKm(stats.yearlyGoal)} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
📷 @DailyRunGuy`;

    const fullDescription = streakSection ? `${streakSection}\n${statsSection}` : statsSection;

    if (existingDescription) {
      return `${fullDescription}\n\n${existingDescription}`;
    }
    
    return fullDescription;
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
