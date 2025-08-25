// fileStorage.js
const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor() {
    this.streakFile = path.join(__dirname, 'streakData.json');
    this.streakData = null;
  }

  // Load streak data from file
  async loadStreakData() {
    try {
      const data = await fs.readFile(this.streakFile, 'utf8');
      this.streakData = JSON.parse(data);
      return this.streakData;
    } catch (error) {
      // If file doesn't exist, initialize with default data
      console.log('No streak data found, initializing new file');
      this.streakData = {
        currentStreak: 237,
        lastRunDate: null,
        lastRunId: null
      };
      await this.saveStreakData();
      return this.streakData;
    }
  }

  // Save streak data to file
  async saveStreakData() {
    await fs.writeFile(this.streakFile, JSON.stringify(this.streakData, null, 2));
    console.log('Streak data saved successfully');
  }

  // Update streak data
  async updateStreak(runDate, runId, distance) {
    // Load data if not already loaded
    if (!this.streakData) {
      await this.loadStreakData();
    }

    const today = new Date().toDateString();
    const runDay = new Date(runDate).toDateString();
    
    // Check if this is a new day and run meets distance requirement
    if (runDay === today && distance >= 4500) {
      // Check if we already processed a run for today
      if (this.streakData.lastRunDate === runDay) {
        return {
          updated: false,
          streak: this.streakData.currentStreak,
          message: "Already processed a run for today"
        };
      }

      // Check if this continues a streak (yesterday or same day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (this.streakData.lastRunDate === yesterday.toDateString() || 
          this.streakData.lastRunDate === null) {
        // Continue the streak
        this.streakData.currentStreak += 1;
      } else {
        // Broken streak, start over
        this.streakData.currentStreak = 1;
      }

      // Update last run info
      this.streakData.lastRunDate = runDay;
      this.streakData.lastRunId = runId;

      await this.saveStreakData();
      
      return {
        updated: true,
        streak: this.streakData.currentStreak,
        message: "Streak updated successfully"
      };
    }
    
    return {
      updated: false,
      streak: this.streakData.currentStreak,
      message: "Run doesn't meet criteria for streak update"
    };
  }

  // Get current streak
  async getCurrentStreak() {
    if (!this.streakData) {
      await this.loadStreakData();
    }
    return this.streakData.currentStreak;
  }
}

module.exports = FileStorage;
