const axios = require('axios');
const stravaAuth = require('./stravaAuth');

class StravaApi {
  constructor() {
    this.baseUrl = 'https://www.strava.com/api/v3';
    this.auth = stravaAuth;
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const accessToken = await this.auth.getAccessToken();
      
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Strava API ${method} ${endpoint} error:`, error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        console.log('Token expired, attempting refresh...');
        // Force token refresh and retry
        try {
          const newAccessToken = await this.auth.refreshTokenIfNeeded();
          const retryConfig = {
            method,
            url: `${this.baseUrl}${endpoint}`,
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json'
            }
          };

          if (data) {
            retryConfig.data = data;
          }

          const retryResponse = await axios(retryConfig);
          return retryResponse.data;
        } catch (retryError) {
          console.error('Retry failed:', retryError.response?.data || retryError.message);
          throw new Error('API request failed after token refresh');
        }
      }
      
      throw error;
    }
  }

  async getRecentActivities(days = 7, page = 1, perPage = 30) {
    const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
    return this.makeRequest(`/athlete/activities?after=${after}&page=${page}&per_page=${perPage}`);
  }

  async getActivity(activityId) {
    return this.makeRequest(`/activities/${activityId}`);
  }

  async updateActivity(activityId, updates) {
    return this.makeRequest(`/activities/${activityId}`, 'PUT', updates);
  }

  async updateActivityDescription(activityId, description) {
    return this.updateActivity(activityId, { description });
  }

  async getAthlete() {
    return this.makeRequest('/athlete');
  }

  async getAthleteStats(athleteId) {
    return this.makeRequest(`/athletes/${athleteId}/stats`);
  }

  async setupWebhook(callbackUrl, verifyToken) {
    try {
      const response = await axios.post(`${this.baseUrl}/push_subscriptions`, {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: verifyToken
      });
      
      return response.data;
    } catch (error) {
      console.error('Webhook setup error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getWebhooks() {
    try {
      const response = await axios.get(`${this.baseUrl}/push_subscriptions`, {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Get webhooks error:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteWebhook(subscriptionId) {
    try {
      const response = await axios.delete(`${this.baseUrl}/push_subscriptions/${subscriptionId}`, {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Delete webhook error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new StravaApi();
