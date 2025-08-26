const axios = require('axios');
const { saveStravaTokens, getStravaTokens } = require('../config/storage');

class StravaAuth {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI || 'https://daily-run-streak.onrender.com/auth/callback';
    this.tokenExpire = parseInt(process.env.REDIS_TOKEN_EXPIRE) || 2592000;
  }

  getAuthUrl() {
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&approval_prompt=force&scope=activity:read_all,activity:write`;
  }

  async exchangeCodeForToken(code) {
    try {
      console.log('Exchanging code for token...');
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;
      
      console.log('Token exchange successful, saving to Redis...');
      
      // Store tokens in Redis
      const tokenData = { access_token, refresh_token, expires_at, athlete };
      const saveResult = await saveStravaTokens(tokenData);
      
      console.log('Save result:', saveResult);
      
      // Also update environment variables for current session
      process.env.ACCESS_TOKEN = access_token;
      process.env.REFRESH_TOKEN = refresh_token;
      process.env.EXPIRES_AT = expires_at;
      
      console.log('Tokens saved successfully');
      return { access_token, refresh_token, expires_at, athlete };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  async refreshTokenIfNeeded() {
    // Try to get tokens from environment first (current session)
    let accessToken = process.env.ACCESS_TOKEN;
    let refreshToken = process.env.REFRESH_TOKEN;
    let expiresAt = process.env.EXPIRES_AT;
    
    console.log('Environment tokens - Access:', accessToken ? 'SET' : 'NOT SET', 'Refresh:', refreshToken ? 'SET' : 'NOT SET', 'Expires:', expiresAt ? 'SET' : 'NOT SET');
    
    // If not in environment, try to get from Redis
    if (!accessToken || !refreshToken || !expiresAt) {
      console.log('Loading tokens from Redis...');
      const tokenData = await getStravaTokens();
      console.log('Redis token data:', tokenData);
      
      if (tokenData && tokenData.access_token) {
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        expiresAt = tokenData.expires_at;
        
        // Update environment variables
        process.env.ACCESS_TOKEN = accessToken;
        process.env.REFRESH_TOKEN = refreshToken;
        process.env.EXPIRES_AT = expiresAt;
        
        console.log('Tokens loaded from Redis to environment');
      }
    }
    
    if (!accessToken || !refreshToken || !expiresAt) {
      console.log('No valid tokens found');
      throw new Error('No authentication tokens found. Please re-authenticate at /auth/strava');
    }
    
    // Check if token needs refreshing
    const currentTime = Date.now() / 1000;
    console.log('Current time:', currentTime, 'Token expires at:', expiresAt);
    
    if (currentTime >= expiresAt) {
      try {
        console.log('Refreshing access token...');
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        console.log('Token refresh successful, updating Redis...');
        
        // Update Redis storage
        const tokenData = { access_token, refresh_token, expires_at };
        await saveStravaTokens(tokenData);
        
        // Update environment variables
        process.env.ACCESS_TOKEN = access_token;
        process.env.REFRESH_TOKEN = refresh_token;
        process.env.EXPIRES_AT = expires_at;
        
        console.log('Access token refreshed successfully');
        return access_token;
      } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        
        // Clear invalid tokens
        await saveStravaTokens({});
        delete process.env.ACCESS_TOKEN;
        delete process.env.REFRESH_TOKEN;
        delete process.env.EXPIRES_AT;
        
        throw new Error('Token refresh failed. Please re-authenticate at /auth/strava');
      }
    }
    
    console.log('Token is still valid, no refresh needed');
    return accessToken;
  }

  async getAccessToken() {
    try {
      return await this.refreshTokenIfNeeded();
    } catch (error) {
      console.error('Error getting access token:', error.message);
      throw error;
    }
  }

  async isAuthenticated() {
    try {
      const tokenData = await getStravaTokens();
      const isAuth = !!(tokenData && tokenData.access_token);
      console.log('Authentication check:', isAuth);
      return isAuth;
    } catch (error) {
      console.error('Error checking authentication:', error.message);
      return false;
    }
  }

  async clearTokens() {
    try {
      await saveStravaTokens({});
      delete process.env.ACCESS_TOKEN;
      delete process.env.REFRESH_TOKEN;
      delete process.env.EXPIRES_AT;
      console.log('Tokens cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error.message);
      return false;
    }
  }

  async getTokenInfo() {
    try {
      const tokenData = await getStravaTokens();
      if (tokenData && tokenData.access_token) {
        const expiresIn = Math.max(0, Math.floor(tokenData.expires_at - Date.now() / 1000));
        
        return {
          hasTokens: true,
          athlete: tokenData.athlete,
          expiresAt: new Date(tokenData.expires_at * 1000).toLocaleString(),
          expiresIn: expiresIn,
          expiresInFormatted: this.formatExpiresIn(expiresIn)
        };
      }
      return { hasTokens: false };
    } catch (error) {
      console.error('Error getting token info:', error.message);
      return { hasTokens: false };
    }
  }

  formatExpiresIn(seconds) {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours`;
    } else {
      return `${Math.floor(seconds / 86400)} days`;
    }
  }

  // Debug method to check token storage
  async debugTokens() {
    try {
      const tokenData = await getStravaTokens();
      return {
        redisData: tokenData,
        envData: {
          ACCESS_TOKEN: process.env.ACCESS_TOKEN ? 'SET' : 'NOT SET',
          REFRESH_TOKEN: process.env.REFRESH_TOKEN ? 'SET' : 'NOT SET', 
          EXPIRES_AT: process.env.EXPIRES_AT ? 'SET' : 'NOT SET'
        },
        hasTokens: !!(tokenData && tokenData.access_token)
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = new StravaAuth();
