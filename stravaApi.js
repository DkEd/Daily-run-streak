const axios = require('axios');
const StravaAuth = require('./stravaAuth');

class StravaApi {
  constructor() {
    this.auth = new StravaAuth();
  }

  async getRecentActivities(days = 7) {
    const accessToken = await this.auth.getAccessToken();
    const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    
    const response = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
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
}

module.exports = StravaApi;
