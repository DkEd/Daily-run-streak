const stravaApi = require('../services/stravaApi');
const { loadStreakStats } = require('../controllers/streakstatsController');
const { formatTime, generateProgressBars, cleanExistingDescription, metersToKm } = require('./formatters');

async function generateDescription(streakStats, activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    // Check if goals are over 100% for 🎉 emoji
    const monthlyGoalPercent = (streakStats.monthlyDistance / streakStats.monthlyGoal) * 100;
    const yearlyGoalPercent = (streakStats.yearlyDistance / streakStats.yearlyGoal) * 100;
    
    const monthlyCelebration = monthlyGoalPercent >= 100 ? ' 🎉' : '';
    const yearlyCelebration = yearlyGoalPercent >= 100 ? ' 🎉' : '';
    
    const description = `🏃🏻‍♂️Daily Run Streak: Day ${streakStats.currentStreak} 👍🏻
📊 ${metersToKm(streakStats.totalDistance)} km | ⏱️ ${formatTime(streakStats.totalTime)} | ⛰️ ${Math.round(streakStats.totalElevation)} m
Monthly: ${metersToKm(streakStats.monthlyDistance)}/${metersToKm(streakStats.monthlyGoal)} km | ⛰️ ${Math.round(streakStats.monthlyElevation)} m
${generateProgressBars(streakStats.monthlyDistance, streakStats.monthlyGoal, 'monthly')}${monthlyCelebration}
Yearly: ${metersToKm(streakStats.yearlyDistance)}/${metersToKm(streakStats.yearlyGoal)} km | ⛰️ ${Math.round(streakStats.yearlyElevation)} m
${generateProgressBars(streakStats.yearlyDistance, streakStats.yearlyGoal, 'yearly')}${yearlyCelebration}
📷 @DailyRunGuy`;

    if (existingDescription) {
      return `${description}\n\n${existingDescription}`;
    }
    
    return description;
  } catch (error) {
    console.error('Error generating description:', error.message);
    
    // Fallback description
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakStats.currentStreak} 👍🏻
📊 ${metersToKm(streakStats.totalDistance)} km | ⏱️ ${formatTime(streakStats.totalTime)} | ⛰️ ${Math.round(streakStats.totalElevation)} m
📷 @DailyRunGuy`;
  }
}

module.exports = {
  generateDescription
};
