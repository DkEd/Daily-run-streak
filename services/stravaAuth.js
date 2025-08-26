const axios = require('axios');
const { saveStravaTokens, getStravaTokens } = require('../config/storage');

class StravaAuth {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
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
      
      // Save tokens to persistent storage
      await saveStravaTokens({
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_at,
        athlete: athlete
      });
      
      return { access_token, refresh_token, expires_at, athlete };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  async refreshTokenIfNeeded() {
    try {
      // Get tokens from persistent storage
      const tokens = await getStravaTokens();
      
      if (!tokens.accessToken || !tokens.refreshToken || !tokens.expiresAt || 
          Date.now() / 1000 >= tokens.expiresAt) {
        
        console.log('Refreshing access token...');
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: tokens.refreshToken,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        // Save new tokens to persistent storage
        await saveStravaTokens({
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expires_at,
          athlete: tokens.athlete
        });
        
        console.log('Access token refreshed successfully');
        return access_token;
      }
      
      return tokens.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Token refresh failed. Please re-authenticate at /auth/strava');
    }
  }

  async getAccessToken() {
    return await this.refreshTokenIfNeeded();
  }

  async isAuthenticated() {
    const tokens = await getStravaTokens();
    return !!tokens.accessToken;
  }
}

module.exports = new StravaAuth();
