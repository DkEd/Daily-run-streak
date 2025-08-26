const stravaApi = require('../services/stravaApi');
const { 
  formatTime, 
  formatDistance, 
  formatElevation, 
  generateProgressBars, 
  cleanExistingDescription 
} = require('./formatters');
const { loadStatsData } = require('../config/storage');

async function generateDescription(streakData, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${formatDistance(streakData.totalDistance)} | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${formatElevation(streakData.totalElevation)}
Monthly: ${formatDistance(stats.monthlyDistance)}/${formatDistance(stats.monthlyGoal)} | ⛰️ ${formatElevation(stats.monthlyElevation)}
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${formatDistance(stats.yearlyDistance)}/${formatDistance(stats.yearlyGoal)} | ⛰️ ${formatElevation(stats.yearlyElevation)}
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
📊 ${formatDistance(streakData.totalDistance)} | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${formatElevation(streakData.totalElevation)}
Monthly: ${formatDistance(stats.monthlyDistance)}/${formatDistance(stats.monthlyGoal)}
Yearly: ${formatDistance(stats.yearlyDistance)}/${formatDistance(stats.yearlyGoal)}
📷 @DailyRunGuy`;
    } else {
      return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${formatDistance(streakData.totalDistance)} | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${formatElevation(streakData.totalElevation)}
📷 @DailyRunGuy`;
    }
  }
}

module.exports = {
  generateDescription
};
