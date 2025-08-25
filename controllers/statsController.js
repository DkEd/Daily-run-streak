const { loadStatsData, saveStatsData } = require('../config/storage');

async function updateStatsWithRun(activity) {
  if (activity.type === 'Run') {
    const stats = await loadStatsData();
    const activityDate = new Date(activity.start_date);
    const now = new Date();
    
    if (stats.lastUpdated) {
      const lastUpdated = new Date(stats.lastUpdated);
      if (lastUpdated.getMonth() !== now.getMonth() || 
          lastUpdated.getFullYear() !== now.getFullYear()) {
        stats.monthlyDistance = 0;
        stats.monthlyTime = 0;
        stats.monthlyElevation = 0;
      }
    }

    stats.monthlyDistance += activity.distance / 1000;
    stats.yearlyDistance += activity.distance / 1000;
    stats.monthlyTime += activity.moving_time || activity.elapsed_time || 0;
    stats.yearlyTime += activity.moving_time || activity.elapsed_time || 0;
    stats.monthlyElevation += activity.total_elevation_gain || 0;
    stats.yearlyElevation += activity.total_elevation_gain || 0;
    stats.lastUpdated = now.toISOString();

    await saveStatsData(stats);
    return stats;
  }
  return null;
}

async function manuallyUpdateStats(monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal) {
  const stats = await loadStatsData();
  
  stats.monthlyDistance = parseFloat(monthlyDistance);
  stats.yearlyDistance = parseFloat(yearlyDistance);
  stats.monthlyTime = parseFloat(monthlyTime);
  stats.yearlyTime = parseFloat(yearlyTime);
  stats.monthlyElevation = parseFloat(monthlyElevation);
  stats.yearlyElevation = parseFloat(yearlyElevation);
  stats.monthlyGoal = parseFloat(monthlyGoal);
  stats.yearlyGoal = parseFloat(yearlyGoal);
  
  await saveStatsData(stats);
  
  return { success: true, message: "Stats updated manually" };
}

async function getAllStats() {
  return await loadStatsData();
}

module.exports = {
  updateStatsWithRun,
  manuallyUpdateStats,
  getAllStats
};
