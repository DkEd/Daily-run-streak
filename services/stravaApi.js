const axios = require('axios');
const stravaAuth = require('./stravaAuth');

class StravaApi {
  constructor() {
    this.auth = stravaAuth;
  }

  async makeAuthenticatedRequest(requestFn) {
    try {
      const accessToken = await this.auth.getAccessToken();
      return await requestFn(accessToken);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token expired, refreshing...');
        // Force token refresh and retry
        const newAccessToken = await this.auth.refreshTokenIfNeeded();
        return await requestFn(newAccessToken);
      }
      throw error;
    }
  }

  async getRecentActivities(days = 7) {
    return this.makeAuthenticatedRequest(async (accessToken) => {
      const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
      
      const response = await axios.get(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      return response.data;
    });
  }

  async getActivity(activityId) {
    return this.makeAuthenticatedRequest(async (accessToken) => {
      const response = await axios.get(
        `https://www.strava.com/api/v3/activities/${activityId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      return response.data;
    });
  }

  async updateActivityDescription(activityId, description) {
    return this.makeAuthenticatedRequest(async (accessToken) => {
      await axios.put(
        `https://www.strava.com/api/v3/activities/${activityId}`,
        { description },
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
    });
  }

  async setupWebhook(callbackUrl, verifyToken) {
    try {
      const response = await axios.post('https://www.strava.com/api/v3/push_subscriptions', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: verifyToken
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getWebhooks() {
    try {
      const response = await axios.get('https://www.strava.com/api/v3/push_subscriptions', {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
        }
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new StravaApi();
