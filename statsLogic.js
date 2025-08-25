const FileStorage = require('./fileStorage');
const StravaApi = require('./stravaApi');

class StatsLogic {
  constructor() {
    this.storage = new FileStorage();
    this.api = new StravaApi();
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  generateProgressBars(distance, goal, segments = 10) {
    const completed = Math.min(Math.floor((distance / goal) * segments), segments);
    return '🟢'.repeat(completed) + '⚪️'.repeat(segments - completed);
  }

  async getFormattedDescription(streakData) {
    const stats = await this.storage.loadStatsData();
    
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻

🔥 Streak: ${streakData.currentStreak} days | 🏃🏻‍♂️${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${this.formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m

📅 Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km 
${this.generateProgressBars(stats.monthlyDistance, stats.monthlyGoal)}

📊 Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km 
${this.generateProgressBars(stats.yearlyDistance, stats.yearlyGoal)}

📷 @DailyRunGuy`;
  }

  async manuallyUpdateStats(monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal) {
    const stats = await this.storage.loadStatsData();
    
    stats.monthlyDistance = parseFloat(monthlyDistance);
    stats.yearlyDistance = parseFloat(yearlyDistance);
    stats.monthlyTime = parseFloat(monthlyTime);
    stats.yearlyTime = parseFloat(yearlyTime);
    stats.monthlyElevation = parseFloat(monthlyElevation);
    stats.yearlyElevation = parseFloat(yearlyElevation);
    stats.monthlyGoal = parseFloat(monthlyGoal);
    stats.yearlyGoal = parseFloat(yearlyGoal);
    
    await this.storage.saveStatsData(stats);
    
    return { success: true, message: "Stats updated successfully" };
  }

  async getAllStats() {
    return await this.storage.loadStatsData();
  }
}

module.exports = StatsLogic;
