const { loadStreakStats, saveStreakStats } = require('./config/storage');

async function migrateTotalTime() {
  try {
    console.log('Starting totalTime migration...');
    const streakStats = await loadStreakStats();
    
    // Check if totalTime exists, if not add it
    if (!streakStats.hasOwnProperty('totalTime')) {
      console.log('Adding totalTime field to existing data...');
      streakStats.totalTime = 0;
      await saveStreakStats(streakStats);
      console.log('Migration completed successfully!');
    } else {
      console.log('totalTime field already exists');
    }
    
    console.log('Current data:', JSON.stringify(streakStats, null, 2));
  } catch (error) {
    console.error('Migration failed:', error.message);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateTotalTime();
}

module.exports = migrateTotalTime;
