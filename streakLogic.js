// streakLogic.js
const StravaApi = require('./stravaApi');
const FileStorage = require('./fileStorage');

class StreakLogic {
  constructor() {
    this.stravaApi = new StravaApi();
    this.fileStorage = new FileStorage();
  }

  // Helper function to format date as YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Function to update the run streak
  async updateRunStreak() {
    try {
      // Get recent activities (last 2 days)
      const activities = await this.stravaApi.getRecentActivities();
      
      // Filter to only runs over 4500 meters and from today
      const today = new Date();
      const todayFormatted = this.formatDate(today);
      
      const todaysRuns = activities.filter(activity => 
        activity.type === 'Run' && 
        activity.distance >= 4500 &&
        activity.start_date_local.startsWith(todayFormatted)
      );
      
      if (todaysRuns.length === 0) {
        // No run today, just return current streak
        const currentStreak = await this.fileStorage.getCurrentStreak();
        return { 
          message: "No run today meeting criteria", 
          streak: currentStreak
        };
      }
      
      // Use the first run of the day (most recent)
      const todaysRun = todaysRuns[0];
      
      // Update streak using file storage
      const updateResult = await this.fileStorage.updateStreak(
        todaysRun.start_date_local,
        todaysRun.id,
        todaysRun.distance
      );
      
      if (updateResult.updated) {
        // Update the activity description with the new streak
        const streakText = `🔥 Streak: day ${updateResult.streak} 🏃\n`;
        const newDescription = todaysRun.description 
          ? streakText + todaysRun.description
          : streakText;
        
        // Only update if the description has changed
        if (newDescription !== todaysRun.description) {
          await this.stravaApi.updateActivityDescription(todaysRun.id, newDescription);
        }
        
        return { 
          message: updateResult.message, 
          streak: updateResult.streak,
          activityId: todaysRun.id,
          activityName: todaysRun.name,
          newDescription: newDescription
        };
      } else {
        return { 
          message: updateResult.message, 
          streak: updateResult.streak
        };
      }
    } catch (error) {
      console.error('Error in updateRunStreak:', error);
      throw error;
    }
  }

  // Get current streak without updating
  async getCurrentStreak() {
    return await this.fileStorage.getCurrentStreak();
  }
}

module.exports = StreakLogic;
