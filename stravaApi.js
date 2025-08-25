// stravaApi.js
const axios = require('axios');
const StravaAuth = require('./stravaAuth');

class StravaApi {
  constructor() {
    this.auth = new StravaAuth();
  }

  // Get recent activities from Strava (last 7 days)
  async getRecentActivities() {
    const accessToken = await this.auth.getAccessToken();
    
    // Calculate date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const after = Math.floor(sevenDaysAgo.getTime() / 1000);
    
    const response = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    return response.data;
  }

  // Update an activity's description
  async updateActivityDescription(activityId, description) {
    const accessToken = await this.auth.getAccessToken();
    
    await axios.put(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        description: description
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
  }
}

module.exports = StravaApi;
