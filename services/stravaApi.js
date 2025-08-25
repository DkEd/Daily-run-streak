const axios = require('axios');
const stravaAuth = require('./stravaAuth');

class StravaApi {
  constructor() {
    this.auth = stravaAuth;
  }

  async getRecentActivities(days = 7) {
    const accessToken = await this.auth.getAccessToken();
    const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    
    const response = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    return response.data;
  }

  async getActivity(activityId) {
    const accessToken = await this.auth.getAccessToken();
    
    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    return response.data;
  }

  async updateActivityDescription(activityId, description) {
    const accessToken = await this.auth.getAccessToken();
    
    await axios.put(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { description },
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
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
