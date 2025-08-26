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
    monthlyDistance: 0,
    yearlyDistance: 0,
    monthlyTime: 0,
    yearlyTime: 0,
    monthlyElevation: 0,
    yearlyElevation: 0,
    monthlyGoal: 250,
    yearlyGoal: 3250,
    lastUpdated: new Date().toISOString()
  },
  STREAK: {
    currentStreak: 0,
    longestStreak: 0,
    totalRuns: 0,
    totalDistance: 0,
    totalTime: 0,
    totalElevation: 0,
    streakStartDate: new Date().toISOString().split('T')[0],
    lastRunDate: null,
    manuallyUpdated: false,
    lastManualUpdate: null
  },
  TOKENS: {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    athlete: null
  },
  WEBHOOK_CONFIG: {
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'DailyRunGuy_Verify_12345',
    secret: process.env.WEBHOOK_SECRET || null
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
    // Check if Redis is available
    const redisAvailable = await redisClient.healthCheck();
    
    if (redisAvailable) {
      // Check if data exists, if not initialize with defaults
      const statsExist = await redisClient.exists(KEYS.STATS);
      const streakExist = await redisClient.exists(KEYS.STREAK);
      const tokensExist = await redisClient.exists(KEYS.TOKENS);
      const webhookExist = await redisClient.exists(KEYS.WEBHOOK_CONFIG);

      if (!statsExist) await redisClient.set(KEYS.STATS, DEFAULT_DATA.STATS);
      if (!streakExist) await redisClient.set(KEYS.STREAK, DEFAULT_DATA.STREAK);
      if (!tokensExist) await redisClient.set(KEYS.TOKENS, DEFAULT_DATA.TOKENS);
      if (!webhookExist) await redisClient.set(KEYS.WEBHOOK_CONFIG, DEFAULT_DATA.WEBHOOK_CONFIG);

      console.log('Data initialization completed in Redis');
    } else {
      console.log('Using in-memory fallback storage (Redis unavailable)');
    }
  } catch (error) {
    console.error('Error initializing data:', error.message);
    console.log('Using in-memory fallback storage');
  }
}

// Stats functions
async function loadStatsData() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const data = await redisClient.get(KEYS.STATS);
      return data || DEFAULT_DATA.STATS;
    } else {
      return memoryFallback[KEYS.STATS];
    }
  } catch (error) {
    console.error('Error loading stats data:', error.message);
    return memoryFallback[KEYS.STATS];
  }
}

async function saveStatsData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.STATS, data);
    } else {
      memoryFallback[KEYS.STATS] = data;
    }
    return true;
  } catch (error) {
    console.error('Error saving stats data:', error.message);
    memoryFallback[KEYS.STATS] = data;
    return false;
  }
}

// Streak functions
async function loadStreakData() {
  try {
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      const data = await redisClient.get(KEYS.STREAK);
      return data || DEFAULT_DATA.STREAK;
    } else {
      return memoryFallback[KEYS.STREAK];
    }
  } catch (error) {
    console.error('Error loading streak data:', error.message);
    return memoryFallback[KEYS.STREAK];
  }
}

async function saveStreakData(data) {
  try {
    data.lastManualUpdate = new Date().toISOString();
    
    const redisAvailable = await redisClient.healthCheck();
    if (redisAvailable) {
      await redisClient.set(KEYS.STREAK, data);
    } else {
      memoryFallback[KEYS.STREAK] = data;
    }
    return true;
  } catch (error) {
    console.error('Error saving streak data:', error.message);
    memoryFallback[KEYS.STREAK] = data;
    return false;
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
    if (tokens.accessToken) process.env.ACCESS_TOKEN = tokens.accessToken;
    if (tokens.refreshToken) process.env.REFRESH_TOKEN = tokens.refreshToken;
    if (tokens.expiresAt) process.env.EXPIRES_AT = tokens.expiresAt;
    
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

// Health check
async function healthCheck() {
  return await redisClient.healthCheck();
}

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
