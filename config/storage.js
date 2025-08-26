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
