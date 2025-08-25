// stravaAuth.js
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class StravaAuth {
  constructor() {
    this.clientId = process.env.CLIENT_ID;
    this.clientSecret = process.env.CLIENT_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;
    this.tokenFile = path.join(__dirname, 'tokens.json');
    this.tokens = null;
  }

  // Load tokens from file
  async loadTokens() {
    try {
      const data = await fs.readFile(this.tokenFile, 'utf8');
      this.tokens = JSON.parse(data);
      return this.tokens;
    } catch (error) {
      console.log('No existing tokens found, need to authenticate');
      return null;
    }
  }

  // Save tokens to file
  async saveTokens(tokens) {
    this.tokens = tokens;
    await fs.writeFile(this.tokenFile, JSON.stringify(tokens, null, 2));
    console.log('Tokens saved successfully');
  }

  // Generate Strava OAuth URL
  getAuthUrl() {
    return `https://www.strava.com/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${this.redirectUri}&approval_prompt=force&scope=activity:read_all,activity:write`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code) {
    try {
      const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;
      
      const tokens = {
        access_token,
        refresh_token,
        expires_at,
        athlete_id: athlete.id
      };
      
      await this.saveTokens(tokens);
      return { access_token, refresh_token, expires_at, athlete };
    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for token');
    }
  }

  // Refresh access token if expired
  async refreshTokenIfNeeded() {
    // Load tokens if not already loaded
    if (!this.tokens) {
      await this.loadTokens();
    }
    
    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate at /auth/strava');
    }
    
    const now = Date.now() / 1000;
    const buffer = 300; // 5 minute buffer
    
    if (now + buffer >= this.tokens.expires_at) {
      console.log('Refreshing access token...');
      
      try {
        const response = await axios.post('https://www.strava.com/oauth/token', {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.tokens.refresh_token,
          grant_type: 'refresh_token'
        });
        
        const { access_token, refresh_token, expires_at } = response.data;
        
        const newTokens = {
          access_token,
          refresh_token,
          expires_at,
          athlete_id: this.tokens.athlete_id
        };
        
        await this.saveTokens(newTokens);
        console.log('Access token refreshed successfully');
        return true;
      } catch (error) {
        console.error('Error refreshing token:', error.response?.data || error.message);
        
        // If refresh token is invalid, clear stored tokens
        if (error.response?.data?.errors?.[0]?.code === 'invalid') {
          console.log('Refresh token invalid, clearing stored tokens');
          this.tokens = null;
          try {
            await fs.unlink(this.tokenFile);
          } catch (e) {
            // Ignore if file doesn't exist
          }
        }
        
        throw new Error('Token refresh failed. Please re-authenticate at /auth/strava');
      }
    }
    return false;
  }

  // Get current access token (refreshing if needed)
  async getAccessToken() {
    await this.refreshTokenIfNeeded();
    return this.tokens.access_token;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.tokens;
  }
}

module.exports = StravaAuth;
