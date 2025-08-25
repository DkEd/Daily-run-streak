// streakLogic.js
const StravaApi = require('./stravaApi');

class StreakLogic {
  constructor() {
    this.stravaApi = new StravaApi();
  }

  // Helper function to format date as YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Extract streak count from activity description
  extractStreakCount(description) {
    if (!description) return null;
    
    const streakMatch = description.match(/🔥 Streak: day (\d+) 🏃/);
    return streakMatch ? parseInt(streakMatch[1]) : null;
  }

  // Function to update the run streak
  async updateRunStreak() {
    // Get recent activities (last 7 days)
    const activities = await this.stravaApi.getRecentActivities();
    
    // Filter to only runs over 4500 meters
    const runs = activities.filter(activity => 
      activity.type === 'Run' && activity.distance >= 4500
    );
    
    // Get today's and yesterday's dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates to match Strava format (YYYY-MM-DD)
    const todayFormatted = this.formatDate(today);
    const yesterdayFormatted = this.formatDate(yesterday);
    
    // Check if there was a run today
    const runToday = runs.find(run => run.start_date_local.startsWith(todayFormatted));
    
    if (runToday) {
      // There was a run today - check if it already has a streak marker
      const todayStreakCount = this.extractStreakCount(runToday.description);
      
      if (todayStreakCount !== null) {
        return { 
          message: "Today's run already has a streak marker", 
          streak: todayStreakCount,
          activityId: runToday.id,
          activityName: runToday.name
        };
      }
      
      // Check if there was a run yesterday
      const runYesterday = runs.find(run => run.start_date_local.startsWith(yesterdayFormatted));
      
      let newStreakCount = 1; // Default to 1 if no previous streak found
      
      if (runYesterday) {
        // There was a run yesterday - extract its streak count
        const yesterdayStreakCount = this.extractStreakCount(runYesterday.description);
        
        if (yesterdayStreakCount !== null) {
          newStreakCount = yesterdayStreakCount + 1;
        } else {
          // No streak found in yesterday's run, look for the most recent streak
          newStreakCount = await this.findCurrentStreak(runs, yesterday);
        }
      } else {
        // No run yesterday, look for the most recent streak
        newStreakCount = await this.findCurrentStreak(runs, yesterday);
      }
      
      // Update the activity description
      const streakText = `🔥 Streak: day ${newStreakCount} 🏃\n`;
      const newDescription = runToday.description 
        ? streakText + runToday.description
        : streakText;
      
      // Only update if the description has changed
      if (newDescription !== runToday.description) {
        await this.stravaApi.updateActivityDescription(runToday.id, newDescription);
        return { 
          message: "Streak updated successfully", 
          streak: newStreakCount,
          activityId: runToday.id,
          activityName: runToday.name,
          newDescription: newDescription
        };
      }
    } else {
      // No run today - check if there was a run yesterday
      const runYesterday = runs.find(run => run.start_date_local.startsWith(yesterdayFormatted));
      
      if (runYesterday) {
        // There was a run yesterday - get its streak count
        const yesterdayStreakCount = this.extractStreakCount(runYesterday.description);
        
        if (yesterdayStreakCount !== null) {
          return { 
            message: "No run today, but yesterday's streak was", 
            streak: yesterdayStreakCount
          };
        } else {
          // No streak found yesterday, check previous days
          const currentStreak = await this.findCurrentStreak(runs, yesterday);
          return { 
            message: "No run today, but current streak is", 
            streak: currentStreak
          };
        }
      } else {
        // No run yesterday either
        return { 
          message: "No runs found for today or yesterday", 
          streak: 0
        };
      }
    }
  }

  // Helper function to find the current streak by checking previous days
  async findCurrentStreak(runs, fromDate) {
    let currentDate = new Date(fromDate);
    let streakCount = 0;
    
    // Check up to 30 days back to find the current streak
    for (let i = 0; i < 30; i++) {
      const dateFormatted = this.formatDate(currentDate);
      const runOnDate = runs.find(run => run.start_date_local.startsWith(dateFormatted));
      
      if (runOnDate) {
        // Found a run on this date - check if it has a streak marker
        const streakMatch = this.extractStreakCount(runOnDate.description);
        
        if (streakMatch !== null) {
          // Found a streak marker, this is our base count
          streakCount = streakMatch;
          break;
        } else {
          // No streak marker but there's a run, count it as part of the streak
          streakCount++;
        }
      } else {
        // No run on this date, streak is broken
        streakCount = 0;
        break;
      }
      
      // Move to the previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streakCount;
  }
}

module.exports = StreakLogic;
