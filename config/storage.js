const redisClient = require('./redis');

// Redis key names
const KEYS = {
  STREAKSTATS: 'app:streakstats',
  TOKENS: 'app:tokens',
  WEBHOOK_CONFIG: 'app:webhook:config',
  LAST_ACTIVITY: 'app:last_activity'
};

// Default structure for initialization
const DEFAULT_DATA = {
  STREAKSTATS: {
    // Streak data
    currentStreak: 0,
    longestStreak: 0,
    lastRunDate: null,
    streakStartDate: new Date().toISOString().split('T')[0],
    
    // Stats data (only what's needed for description)
    monthlyDistance: 0,
    yearlyDistance: 0,
    monthlyElevation: 0,
    yearlyElevation: 0,
    monthlyGoal: 250000,    // 250 km in meters
    yearlyGoal: 3250000,    // 3250 km in meters
    
    // Totals (for description)
    totalRuns: 0,
    totalDistance: 0,
    totalTime: 0,
    totalElevation: 0,
    
    // Management
    manuallyUpdated: false,
    lastUpdated: new Date().toISOString()
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
  },
  LAST_ACTIVITY: {
    id: null,
    date: null,
    type: null,
    distance: 0
  }
};

// In-memory fallback for when Redis is unavailable
let memoryFallback = {
  [KEYS.STREAKSTATS]: { ...DEFAULT_DATA.STREAKSTATS },
  [KEYS.TOKENS]: { ...DEFAULT_DATA.TOKENS },
  [KEYS.WEBHOOK_CONFIG]: { ...DEFAULT_DATA.WEBHOOK_CONFIG },
  [KEYS.LAST_ACTIVITY]: { ...DEFAULT_DATA.LAST_ACTIVITY }
};

async function initializeData() {
  try {
    console.log('Initializing data...');
    
    // Check if Redis is available
    const redisAvailable = await redisClient.healthCheck();
    
    if (redisAvailable) {
      console.log('Redis is available, initializing data...');
      
      // Check if data exists, if not initialize with defaults
      const streakstatsExist = await redisClient.exists(KEYS.STREAKSTATS);
      const tokensExist = await redisClient.exists(KEYS.TOKENS);
      const webhookExist = await redisClient.exists(KEYS.WEBHOOK_CONFIG);
      const lastActivityExist = await redisClient.exists(KEYS.LAST_ACTIVITY);

      if (!streakstatsExist) {
        console.log('Initializing streakstats data...');
        await redisClient.set(KEYS.STREAKSTATS, DEFAULT_DATA.STREAKSTATS);
      }
      
      if (!tokensExist) {
        console.log('Initializing tokens data...');
        await redisClient.set(KEYS.TOKENS, DEFAULT_DATA.TOKENS);
      }
      
      if (!webhookExist) {
        console.log('Initializing webhook config...');
        await redisClient.set(KEYS.WEBHOOK_CONFIG, DEFAULT_DATA.WEBHOOK_CONFIG);
      }

      if (!lastActivityExist) {
        console.log('Initializing last activity data...');
        await redisClient.set(KEYS.LAST_ACTIVITY, DEFAULT_DATA.LAST_ACTIVITY);
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

// Streakstats functions
async function loadStreakStats() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const data = await redisClient.get(KEYS.STREAKSTATS);
      return data || DEFAULT_DATA.STREAKSTATS;
    } else {
      return memoryFallback[KEYS.STREAKSTATS];
    }
  } catch (error) {
    console.error('Error loading streakstats:', error.message);
    return memoryFallback[KEYS.STREAKSTATS];
  }
}

async function saveStreakStats(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.STREAKSTATS, data);
    } else {
      memoryFallback[KEYS.STREAKSTATS] = data;
    }
    return true;
  } catch (error) {
    console.error('Error saving streakstats:', error.message);
    memoryFallback[KEYS.STREAKSTATS] = data;
    return false;
  }
}

// Backward compatibility function
async function loadStatsData() {
  try {
    console.log('⚠️  loadStatsData() is deprecated - using loadStreakStats() instead');
    const streakStats = await loadStreakStats();
    
    // Convert back to old stats format for compatibility
    return {
      monthlyDistance: streakStats.monthlyDistance,
      yearlyDistance: streakStats.yearlyDistance,
      monthlyTime: 0, // Not used anymore but kept for compatibility
      yearlyTime: 0,  // Not used anymore but kept for compatibility
      monthlyElevation: streakStats.monthlyElevation,
      yearlyElevation: streakStats.yearlyElevation,
      monthlyGoal: streakStats.monthlyGoal,
      yearlyGoal: streakStats.yearlyGoal,
      lastUpdated: streakStats.lastUpdated,
      manuallyUpdated: streakStats.manuallyUpdated
    };
  } catch (error) {
    console.error('Error in loadStatsData compatibility:', error.message);
    return {
      monthlyDistance: 0,
      yearlyDistance: 0,
      monthlyTime: 0,
      yearlyTime: 0,
      monthlyElevation: 0,
      yearlyElevation: 0,
      monthlyGoal: 250000,
      yearlyGoal: 3250000,
      lastUpdated: new Date().toISOString(),
      manuallyUpdated: false
    };
  }
}

// Token functions
async function saveStravaTokens(tokens) {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.TOKENS, tokens);
    } else {
      memoryFallback[KEYS.TOKENS] = tokens;
    }
    
    // Also update environment variables for current session
    if (tokens.access_token) process.env.ACCESS_TOKEN = tokens.access_token;
    if (tokens.refresh_token) process.env.REFRESH_TOKEN = tokens.refresh_token;
    if (tokens.expires_at) process.env.EXPIRES_AT = tokens.expires_at;
    
    return true;
  } catch (error) {
    console.error('Error saving tokens:', error.message);
    memoryFallback[KEYS.TOKENS] = tokens;
    return false;
  }
}

async function getStravaTokens() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const tokens = await redisClient.get(KEYS.TOKENS);
      return tokens || DEFAULT_DATA.TOKENS;
    } else {
      return memoryFallback[KEYS.TOKENS];
    }
  } catch (error) {
    console.error('Error loading tokens:', error.message);
    return memoryFallback[KEYS.TOKENS];
  }
}

// Webhook config functions
async function getWebhookConfig() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const config = await redisClient.get(KEYS.WEBHOOK_CONFIG);
      return config || DEFAULT_DATA.WEBHOOK_CONFIG;
    } else {
      return memoryFallback[KEYS.WEBHOOK_CONFIG];
    }
  } catch (error) {
    console.error('Error loading webhook config:', error.message);
    return memoryFallback[KEYS.WEBHOOK_CONFIG];
  }
}

async function saveWebhookConfig(config) {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.WEBHOOK_CONFIG, config);
    } else {
      memoryFallback[KEYS.WEBHOOK_CONFIG] = config;
    }
    return true;
  } catch (error) {
    console.error('Error saving webhook config:', error.message);
    memoryFallback[KEYS.WEBHOOK_CONFIG] = config;
    return false;
  }
}

// Last activity functions
async function saveLastActivity(activity) {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.LAST_ACTIVITY, activity);
    } else {
      memoryFallback[KEYS.LAST_ACTIVITY] = activity;
    }
    return true;
  } catch (error) {
    console.error('Error saving last activity:', error.message);
    memoryFallback[KEYS.LAST_ACTIVITY] = activity;
    return false;
  }
}

async function getLastActivity() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const data = await redisClient.get(KEYS.LAST_ACTIVITY);
      return data || DEFAULT_DATA.LAST_ACTIVITY;
    } else {
      return memoryFallback[KEYS.LAST_ACTIVITY];
    }
  } catch (error) {
    console.error('Error loading last activity:', error.message);
    return memoryFallback[KEYS.LAST_ACTIVITY];
  }
}

// Health check
async function healthCheck() {
  return await redisClient.healthCheck();
}

// Export functions
module.exports = {
  initializeData,
  loadStreakStats,
  saveStreakStats,
  loadStatsData,
  saveStravaTokens,
  getStravaTokens,
  getWebhookConfig,
  saveWebhookConfig,
  saveLastActivity,
  getLastActivity,
  healthCheck
};
