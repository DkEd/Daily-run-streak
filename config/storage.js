const redisClient = require('./redis');

// Redis key names
const KEYS = {
  STATS: 'app:stats',
  STREAK: 'app:streak',
  TOKENS: 'app:tokens',
  WEBHOOK_CONFIG: 'app:webhook:config'
};

// Default structure for initialization
const DEFAULT_DATA = {
  STATS: {
    monthlyDistance: 0.00,
    yearlyDistance: 0.00,
    monthlyTime: 0,
    yearlyTime: 0,
    monthlyElevation: 0,
    yearlyElevation: 0,
    monthlyGoal: 250.00,
    yearlyGoal: 3250.00,
    lastUpdated: new Date().toISOString()
  },
  STREAK: {
    currentStreak: 0,
    longestStreak: 0,
    totalRuns: 0,
    totalDistance: 0.00,
    totalTime: 0,
    totalElevation: 0,
    streakStartDate: new Date().toISOString().split('T')[0],
    lastRunDate: null,
    manuallyUpdated: false,
    lastManualUpdate: null
  },
  TOKENS: {
    access_token: null,
    refresh_token: null,
    expires_at: null,
    athlete: null
  },
  WEBHOOK_CONFIG: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'DailyRunGuy_Verify_12345',
    secret: process.env.WEBHOOK_SECRET || 'your-webhook-secret-here'
  }
};

// In-memory fallback for when Redis is unavailable
let memoryFallback = {
  [KEYS.STATS]: { ...DEFAULT_DATA.STATS },
  [KEYS.STREAK]: { ...DEFAULT_DATA.STREAK },
  [KEYS.TOKENS]: { ...DEFAULT_DATA.TOKENS },
  [KEYS.WEBHOOK_CONFIG]: { ...DEFAULT_DATA.WEBHOOK_CONFIG }
};

async function initializeData() {
  try {
    console.log('Initializing data...');
    
    // Check if Redis is available
    const redisAvailable = await redisClient.healthCheck();
    
    if (redisAvailable) {
      console.log('Redis is available, initializing data...');
      
      // Check if data exists, if not initialize with defaults
      const statsExist = await redisClient.exists(KEYS.STATS);
      const streakExist = await redisClient.exists(KEYS.STREAK);
      const tokensExist = await redisClient.exists(KEYS.TOKENS);
      const webhookExist = await redisClient.exists(KEYS.WEBHOOK_CONFIG);

      if (!statsExist) {
        console.log('Initializing stats data...');
        await redisClient.set(KEYS.STATS, DEFAULT_DATA.STATS);
      }
      
      if (!streakExist) {
        console.log('Initializing streak data...');
        await redisClient.set(KEYS.STREAK, DEFAULT_DATA.STREAK);
      }
      
      if (!tokensExist) {
        console.log('Initializing tokens data...');
        await redisClient.set(KEYS.TOKENS, DEFAULT_DATA.TOKENS);
      }
      
      if (!webhookExist) {
        console.log('Initializing webhook config...');
        await redisClient.set(KEYS.WEBHOOK_CONFIG, DEFAULT_DATA.WEBHOOK_CONFIG);
      }

      console.log('Data initialization completed in Redis');
    } else {
      console.log('Using in-memory fallback storage (Redis unavailable)');
    }
  } catch (error) {
    console.error('Error initializing data:', error.message);
    console.log('Using in-memory fallback storage');
  }
}

// ... (all the other functions: loadStatsData, saveStatsData, loadStreakData, saveStreakData, saveStravaTokens, getStravaTokens, getWebhookConfig, saveWebhookConfig, healthCheck)

// Export functions
module.exports = {
  initializeData,
  loadStatsData,
  saveStatsData,
  loadStreakData,
  saveStreakData,
  saveStravaTokens,
  getStravaTokens,
  getWebhookConfig,
  saveWebhookConfig,
  healthCheck
};
