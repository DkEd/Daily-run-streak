const axios = require('axios');

class StravaAuth {
  constructor() {
    this.accessToken = process.env.ACCESS_TOKEN;
    this.refreshToken = process.env.REFRESH_TOKEN;
    this.expiresAt = process.env.EXPIRES_AT;
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
      
      // Update environment variables
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
    if (!this.expiresAt || Date.now() / 1000 >= this.expiresAt) {
      try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        process.env.ACCESS_TOKEN = access_token;
        process.env.REFRESH_TOKEN = refresh_token;
        process.env.EXPIRES_AT = expires_at;
        
        console.log('Access token refreshed successfully');
      } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        throw new Error('Token refresh failed. Please re-authenticate');
      }
    }
  }

  async getAccessToken() {
    await this.refreshTokenIfNeeded();
    return process.env.ACCESS_TOKEN;
  }

  isAuthenticated() {
    return !!process.env.ACCESS_TOKEN;
  }
}

module.exports = StravaAuth;
