const redisClient = require('./redis');

// Default structure for stats data
const defaultStatsData = {
  monthlyDistance: 229.5,
  yearlyDistance: 2336.0,
  monthlyTime: 0,
  yearlyTime: 0,
  monthlyElevation: 2793,
  yearlyElevation: 25595,
  monthlyGoal: 250,
  yearlyGoal: 3250,
  lastUpdated: new Date().toISOString(),
  
  // Webhook configuration
  webhookConfig: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'DailyRunGuy_Verify_12345',
    secret: process.env.WEBHOOK_SECRET || null
  }
};

// Default structure for streak data
const defaultStreakData = {
  currentStreak: 238,
  longestStreak: 238,
  totalRuns: 238,
  totalDistance: 2346600,
  totalTime: 699900,
  totalElevation: 25714,
  streakStartDate: "2024-12-31",
  lastRunDate: new Date(Date.now() - 86400000).toDateString(),
  manuallyUpdated: true,
  lastManualUpdate: new Date().toDateString()
};

async function loadStreakData(forceRefresh = false) {
  try {
    let streakData = await redisClient.loadStreakData();
    
    if (!streakData) {
      // Initialize with default data if none exists
      streakData = defaultStreakData;
      await redisClient.saveStreakData(streakData);
      console.log('Initialized new streak data in Redis');
    }
    
    return streakData;
  } catch (error) {
    console.error('Error loading streak data from Redis:', error);
    return defaultStreakData;
  }
}

async function saveStreakData(data) {
  try {
    data.lastManualUpdate = new Date().toDateString();
    await redisClient.saveStreakData(data);
    return true;
  } catch (error) {
    console.error('Error saving streak data to Redis:', error);
    return false;
  }
}

async function loadStatsData(forceRefresh = false) {
  try {
    let statsData = await redisClient.loadStatsData();
    
    if (!statsData) {
      // Initialize with default data if none exists
      statsData = defaultStatsData;
      await redisClient.saveStatsData(statsData);
      console.log('Initialized new stats data in Redis');
    }
    
    return statsData;
  } catch (error) {
    console.error('Error loading stats data from Redis:', error);
    return defaultStatsData;
  }
}

async function saveStatsData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    await redisClient.saveStatsData(data);
    return true;
  } catch (error) {
    console.error('Error saving stats data to Redis:', error);
    return false;
  }
}

// Webhook config functions
async function getWebhookConfig() {
  try {
    const statsData = await loadStatsData();
    return statsData.webhookConfig || {};
  } catch (error) {
    console.error('Error loading webhook config:', error);
    return {};
  }
}

module.exports = {
  loadStreakData,
  saveStreakData,
  loadStatsData,
  saveStatsData,
  getWebhookConfig
};
