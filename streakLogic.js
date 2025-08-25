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

  // Helper function to find the current streak by checking previous days
  async findCurrentStreak(runs, fromDate) {
    let currentDate = new Date(fromDate);
    let streakCount = 0;
    let foundStart = false;
    
    // Check up to 30 days back to find the current streak
    for (let i = 0; i < 30; i++) {
      const dateFormatted = this.formatDate(currentDate);
      const runOnDate = runs.find(run => run.start_date_local.startsWith(dateFormatted));
      
      if (runOnDate) {
        // Found a run on this date
        if (!foundStart) {
          // This is the most recent run in the streak
          const streakMatch = runOnDate.description && runOnDate.description.match(/Streak: day (\d+)/);
          
          if (streakMatch) {
            // Found a streak marker, use this as the base
            streakCount = parseInt(streakMatch[1]);
            foundStart = true;
          } else if (i === 0) {
            // No streak marker on the most recent run, start at 1
            streakCount = 1;
            foundStart = true;
          } else {
            // No streak marker, but we're counting backwards
            streakCount++;
          }
        } else {
          // We're counting backwards through the streak
          streakCount++;
        }
      } else if (foundStart) {
        // We found the start of the streak and now we've hit a day with no run
        break;
      }
      
      // Move to the previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streakCount;
  }

  // Function to update the run streak
  async updateRunStreak() {
    // Get recent activities
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
      const streakMatch = runToday.description && runToday.description.match(/🔥Streak: day (\d+) 🏃/);
      
      if (streakMatch) {
        return { 
          message: "Today's run already has a streak marker", 
          streak: parseInt(streakMatch[1]),
          activityId: runToday.id,
          activityName: runToday.name
        };
      }
      
      // Check if there was a run yesterday
      const runYesterday = runs.find(run => run.start_date_local.startsWith(yesterdayFormatted));
      
      let newStreakCount = 1;
      
      if (runYesterday) {
        // There was a run yesterday - check its streak count
        const yesterdayStreakMatch = runYesterday.description && runYesterday.description.match(/🔥 Streak: day (\d+) 🏃/);
        
        if (yesterdayStreakMatch) {
          newStreakCount = parseInt(yesterdayStreakMatch[1]) + 1;
        } else {
          // No streak found yesterday, check previous days to find the current streak
          newStreakCount = await this.findCurrentStreak(runs, yesterday);
        }
      } else {
        // No run yesterday, check if we need to continue a streak from before yesterday
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
        const yesterdayStreakMatch = runYesterday.description && runYesterday.description.match(/🔥 Streak: day (\d+) 🏃/);
        
        if (yesterdayStreakMatch) {
          return { 
            message: "No run today, but yesterday's streak was", 
            streak: parseInt(yesterdayStreakMatch[1])
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
}

module.exports = StreakLogic;
