const axios = require('axios');
const { saveStravaTokens, getStravaTokens } = require('../config/storage');

class StravaAuth {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
    this.tokenExpire = parseInt(process.env.REDIS_TOKEN_EXPIRE) || 2592000;
  }

  getAuthUrl() {
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&approval_prompt=force&scope=activity:read_all,activity:write`;
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;
      
      // Store tokens in Redis
      const tokenData = { access_token, refresh_token, expires_at, athlete };
      await saveStravaTokens(tokenData);
      
      // Also update environment variables for current session
      process.env.ACCESS_TOKEN = access_token;
      process.env.REFRESH_TOKEN = refresh_token;
      process.env.EXPIRES_AT = expires_at;
      
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
    
    // If not in environment, try to get from Redis
    if (!accessToken || !refreshToken || !expiresAt) {
      const tokenData = await getStravaTokens();
      if (tokenData && tokenData.accessToken) {
        accessToken = tokenData.accessToken;
        refreshToken = tokenData.refreshToken;
        expiresAt = tokenData.expiresAt;
        
        // Update environment variables
        process.env.ACCESS_TOKEN = accessToken;
        process.env.REFRESH_TOKEN = refreshToken;
        process.env.EXPIRES_AT = expiresAt;
      }
    }
    
    if (!accessToken || !refreshToken || !expiresAt) {
      throw new Error('No authentication tokens found. Please re-authenticate at /auth/strava');
    }
    
    // Check if token needs refreshing
    if (Date.now() / 1000 >= expiresAt) {
      try {
        console.log('Refreshing access token...');
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        // Update Redis storage
        const tokenData = await getStravaTokens();
        tokenData.access_token = access_token;
        tokenData.refresh_token = refresh_token;
        tokenData.expires_at = expires_at;
        
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
    
    return accessToken;
  }

  async getAccessToken() {
    return await this.refreshTokenIfNeeded();
  }

  async isAuthenticated() {
    try {
      const tokenData = await getStravaTokens();
      return !!(tokenData && tokenData.accessToken);
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
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error.message);
      return false;
    }
  }

  async getTokenInfo() {
    try {
      const tokenData = await getStravaTokens();
      if (tokenData && tokenData.accessToken) {
        return {
          hasTokens: true,
          athlete: tokenData.athlete,
          expiresAt: new Date(tokenData.expires_at * 1000).toLocaleString(),
          expiresIn: Math.max(0, Math.floor(tokenData.expires_at - Date.now() / 1000))
        };
      }
      return { hasTokens: false };
    } catch (error) {
      console.error('Error getting token info:', error.message);
      return { hasTokens: false };
    }
  }
}

module.exports = new StravaAuth();
