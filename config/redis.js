const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.connect();
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          tls: redisUrl.startsWith('rediss://'),
          rejectUnauthorized: false
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
      });

      await this.client.connect();
      console.log('Redis connection established');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  async set(key, value, expireSeconds = null) {
    try {
      if (expireSeconds) {
        await this.client.set(key, JSON.stringify(value), 'EX', expireSeconds);
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  // Special method for storing stats data
  async saveStatsData(data) {
    try {
      await this.set('strava_stats', data);
      console.log('Stats data saved to Redis');
      return true;
    } catch (error) {
      console.error('Error saving stats data:', error);
      return false;
    }
  }

  // Special method for loading stats data
  async loadStatsData() {
    try {
      const data = await this.get('strava_stats');
      if (data) {
        console.log('Stats data loaded from Redis');
        return data;
      }
      console.log('No stats data found in Redis');
      return null;
    } catch (error) {
      console.error('Error loading stats data:', error);
      return null;
    }
  }

  // Special method for storing streak data
  async saveStreakData(data) {
    try {
      await this.set('strava_streak', data);
      console.log('Streak data saved to Redis');
      return true;
    } catch (error) {
      console.error('Error saving streak data:', error);
      return false;
    }
  }

  // Special method for loading streak data
  async loadStreakData() {
    try {
      const data = await this.get('strava_streak');
      if (data) {
        console.log('Streak data loaded from Redis');
        return data;
      }
      console.log('No streak data found in Redis');
      return null;
    } catch (error) {
      console.error('Error loading streak data:', error);
      return null;
    }
  }
}

module.exports = new RedisClient();
