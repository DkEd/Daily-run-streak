const FileStorage = require('./fileStorage');
const StravaApi = require('./stravaApi');
const StatsLogic = require('./statsLogic');

class StreakLogic {
  constructor() {
    this.storage = new FileStorage();
    this.api = new StravaApi();
    this.stats = new StatsLogic();
  }

  formatDate(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  async updateRunStreak() {
    try {
      const activities = await this.api.getRecentActivities(2);
      const today = this.formatDate(new Date());
      
      // Find today's qualifying run
      const todaysRun = activities.find(activity => 
        activity.type === 'Run' && 
        activity.distance >= 4500 &&
        this.formatDate(new Date(activity.start_date)) === today
      );

      if (!todaysRun) {
        const streakData = await this.storage.loadStreakData();
        return { message: "No qualifying run today", ...streakData };
      }

      // Load and update streak data
      const streakData = await this.storage.loadStreakData();
      const todayDate = new Date().toDateString();
      
      // Check if we already processed today
      if (streakData.lastRunDate === todayDate) {
        return { message: "Already processed today's run", ...streakData };
      }

      // Update streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (streakData.lastRunDate === yesterday.toDateString()) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }

      // Update totals
      streakData.totalRuns += 1;
      streakData.totalDistance += todaysRun.distance;
      streakData.totalTime += todaysRun.moving_time || 0;
      streakData.totalElevation += todaysRun.total_elevation_gain || 0;
      streakData.lastRunDate = todayDate;

      // Update longest streak
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }

      // Save updated data
      await this.storage.saveStreakData(streakData);

      // Update activity description
      const description = await this.stats.getFormattedDescription(streakData);
      await this.api.updateActivityDescription(todaysRun.id, description);

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

  async getCurrentStreak() {
    const data = await this.storage.loadStreakData();
    return data.currentStreak;
  }

  async getAllStreakData() {
    return await this.storage.loadStreakData();
  }

  async manuallyUpdateStreak(newStreakCount, newLongestStreak, newTotalRuns, newTotalDistance, newTotalTime, newTotalElevation, newStreakStartDate) {
    const streakData = await this.storage.loadStreakData();
    
    streakData.currentStreak = parseInt(newStreakCount);
    streakData.longestStreak = parseInt(newLongestStreak);
    streakData.totalRuns = parseInt(newTotalRuns);
    streakData.totalDistance = parseFloat(newTotalDistance);
    streakData.totalTime = parseFloat(newTotalTime);
    streakData.totalElevation = parseFloat(newTotalElevation);
    streakData.streakStartDate = newStreakStartDate;
    
    await this.storage.saveStreakData(streakData);
    
    return { success: true, message: "Streak updated successfully" };
  }
}

module.exports = StreakLogic;
