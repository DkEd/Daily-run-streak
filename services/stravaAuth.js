const axios = require('axios');
const { saveStravaTokens, getStravaTokens } = require('../config/storage');

class StravaAuth {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI || 'https://daily-run-streak.onrender.com/auth/callback';
    this.tokenExpire = parseInt(process.env.REDIS_TOKEN_EXPIRE) || 2592000; // 30 days
  }

  getAuthUrl() {
    if (!this.clientId) {
      throw new Error('CLIENT_ID environment variable is not set');
    }
    
    if (!this.redirectUri) {
      throw new Error('REDIRECT_URI environment variable is not set');
    }
    
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&approval_prompt=force&scope=activity:read_all,activity:write`;
  }

  async exchangeCodeForToken(code) {
    try {
      console.log('Exchanging authorization code for access token...');
      
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Strava client credentials not configured');
      }

      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;
      
      console.log('Token exchange successful:', {
        access_token: access_token ? `${access_token.substring(0, 15)}...` : 'MISSING',
        refresh_token: refresh_token ? `${refresh_token.substring(0, 15)}...` : 'MISSING',
        expires_at: new Date(expires_at * 1000).toLocaleString(),
        athlete: athlete ? `${athlete.firstname} ${athlete.lastname}` : 'MISSING'
      });
      
      // Store tokens in Redis
      const tokenData = { access_token, refresh_token, expires_at, athlete };
      const saveResult = await saveStravaTokens(tokenData);
      
      console.log('Tokens saved to storage:', saveResult);
      
      // Also update environment variables for current session
      process.env.ACCESS_TOKEN = access_token;
      process.env.REFRESH_TOKEN = refresh_token;
      process.env.EXPIRES_AT = expires_at;
      
      console.log('Environment variables updated for current session');
      return { access_token, refresh_token, expires_at, athlete };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error(`Failed to exchange code for token: ${error.response?.data?.message || error.message}`);
    }
  }

  async refreshTokenIfNeeded() {
    console.log('Checking if token refresh is needed...');
    
    // Try to get tokens from environment first (current session)
    let accessToken = process.env.ACCESS_TOKEN;
    let refreshToken = process.env.REFRESH_TOKEN;
    let expiresAt = process.env.EXPIRES_AT;
    
    console.log('Environment tokens:', {
      accessToken: accessToken ? 'SET' : 'NOT SET',
      refreshToken: refreshToken ? 'SET' : 'NOT SET',
      expiresAt: expiresAt ? 'SET' : 'NOT SET'
    });
    
    // If not in environment, try to get from Redis
    if (!accessToken || !refreshToken || !expiresAt) {
      console.log('Loading tokens from storage...');
      const tokenData = await getStravaTokens();
      
      console.log('Tokens from storage:', {
        hasAccessToken: !!(tokenData && tokenData.access_token),
        hasRefreshToken: !!(tokenData && tokenData.refresh_token),
        hasExpiresAt: !!(tokenData && tokenData.expires_at)
      });
      
      if (tokenData && tokenData.access_token) {
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token;
        expiresAt = tokenData.expires_at;
        
        // Update environment variables
        process.env.ACCESS_TOKEN = accessToken;
        process.env.REFRESH_TOKEN = refreshToken;
        process.env.EXPIRES_AT = expiresAt;
        
        console.log('Tokens loaded from storage to environment');
      }
    }
    
    if (!accessToken || !refreshToken || !expiresAt) {
      console.log('No valid tokens found in environment or storage');
      throw new Error('No authentication tokens found. Please re-authenticate at /auth/strava');
    }
    
    // Check if token needs refreshing
    const currentTime = Date.now() / 1000;
    const tokenExpiry = parseInt(expiresAt);
    const expiresIn = tokenExpiry - currentTime;
    
    console.log('Token expiry check:', {
      currentTime: new Date(currentTime * 1000).toLocaleString(),
      tokenExpiry: new Date(tokenExpiry * 1000).toLocaleString(),
      expiresIn: `${expiresIn} seconds (${Math.round(expiresIn / 60)} minutes)`,
      needsRefresh: expiresIn < 300 // Refresh if less than 5 minutes remaining
    });
    
    if (expiresIn < 300) {
      try {
        console.log('Refreshing access token...');
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        console.log('Token refresh successful:', {
          newAccessToken: access_token ? `${access_token.substring(0, 15)}...` : 'MISSING',
          newRefreshToken: refresh_token ? `${refresh_token.substring(0, 15)}...` : 'MISSING',
          newExpiresAt: new Date(expires_at * 1000).toLocaleString()
        });
        
        // Update Redis storage
        const tokenData = await getStravaTokens();
        if (tokenData && tokenData.athlete) {
          tokenData.access_token = access_token;
          tokenData.refresh_token = refresh_token;
          tokenData.expires_at = expires_at;
        } else {
          tokenData = { access_token, refresh_token, expires_at };
        }
        
        await saveStravaTokens(tokenData);
        
        // Update environment variables
        process.env.ACCESS_TOKEN = access_token;
        process.env.REFRESH_TOKEN = refresh_token;
        process.env.EXPIRES_AT = expires_at;
        
        console.log('Access token refreshed and saved successfully');
        return access_token;
      } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        
        // Clear invalid tokens
        await this.clearTokens();
        
        throw new Error('Token refresh failed. Please re-authenticate at /auth/strava');
      }
    }
    
    console.log('Token is still valid, no refresh needed');
    return accessToken;
  }

  async getAccessToken() {
    try {
      console.log('Getting access token...');
      const token = await this.refreshTokenIfNeeded();
      console.log('Access token obtained successfully');
      return token;
    } catch (error) {
      console.error('Error getting access token:', error.message);
      throw error;
    }
  }

  async isAuthenticated() {
    try {
      console.log('Checking authentication status...');
      const tokenData = await getStravaTokens();
      const isAuth = !!(tokenData && tokenData.access_token);
      
      console.log('Authentication check result:', isAuth);
      if (isAuth) {
        console.log('Token details:', {
          athlete: tokenData.athlete ? `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}` : 'MISSING',
          expiresAt: new Date(tokenData.expires_at * 1000).toLocaleString(),
          expiresIn: `${Math.round((tokenData.expires_at - Date.now() / 1000) / 60)} minutes`
        });
      }
      
      return isAuth;
    } catch (error) {
      console.error('Error checking authentication:', error.message);
      return false;
    }
  }

  async clearTokens() {
    try {
      console.log('Clearing authentication tokens...');
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
      console.log('Getting token information...');
      const tokenData = await getStravaTokens();
      
      if (tokenData && tokenData.access_token) {
        const expiresIn = Math.max(0, Math.floor(tokenData.expires_at - Date.now() / 1000));
        
        const result = {
          hasTokens: true,
          athlete: tokenData.athlete,
          expiresAt: new Date(tokenData.expires_at * 1000).toLocaleString(),
          expiresIn: expiresIn,
          expiresInFormatted: this.formatExpiresIn(expiresIn),
          isValid: expiresIn > 0
        };
        
        console.log('Token info retrieved:', result);
        return result;
      }
      
      console.log('No token data found');
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
      console.log('Debugging token storage...');
      const tokenData = await getStravaTokens();
      
      const result = {
        redisData: tokenData,
        envData: {
          ACCESS_TOKEN: process.env.ACCESS_TOKEN ? 'SET' : 'NOT SET',
          REFRESH_TOKEN: process.env.REFRESH_TOKEN ? 'SET' : 'NOT SET', 
          EXPIRES_AT: process.env.EXPIRES_AT ? 'SET' : 'NOT SET'
        },
        hasTokens: !!(tokenData && tokenData.access_token),
        isValid: !!(tokenData && tokenData.access_token && tokenData.expires_at > Date.now() / 1000),
        config: {
          CLIENT_ID: this.clientId ? 'SET' : 'NOT SET',
          CLIENT_SECRET: this.clientSecret ? 'SET' : 'NOT SET',
          REDIRECT_URI: this.redirectUri || 'NOT SET'
        }
      };
      
      console.log('Debug tokens result:', result);
      return result;
    } catch (error) {
      console.error('Error in debugTokens:', error.message);
      return { error: error.message };
    }
  }

  // Check if client credentials are configured
  isConfigured() {
    const isConfigured = !!(this.clientId && this.clientSecret && this.redirectUri);
    console.log('Strava auth configuration check:', {
      clientId: this.clientId ? 'SET' : 'NOT SET',
      clientSecret: this.clientSecret ? 'SET' : 'NOT SET',
      redirectUri: this.redirectUri ? 'SET' : 'NOT SET',
      isConfigured: isConfigured
    });
    
    return isConfigured;
  }

  // Get configuration status for debugging
  getConfigStatus() {
    return {
      clientId: this.clientId ? 'SET' : 'NOT SET',
      clientSecret: this.clientSecret ? 'SET' : 'NOT SET',
      redirectUri: this.redirectUri || 'NOT SET',
      isConfigured: this.isConfigured()
    };
  }
}

module.exports = new StravaAuth();
