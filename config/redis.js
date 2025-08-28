const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connect();
  }

  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      console.log('Connecting to Redis:', redisUrl.replace(/:([^:@]+)@/, ':****@')); // Mask password in logs
      
      // Configuration for Upstash Redis (standard redis:// protocol)
      this.client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          keepAlive: 30000,
          // Upstash might need these additional options
          tls: redisUrl.includes('upstash.io') || redisUrl.includes('upstash.com'),
          rejectUnauthorized: false
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connecting to Upstash...');
      });

      this.client.on('ready', () => {
        console.log('Redis Client Connected and Ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      console.log('Successfully connected to Upstash Redis');
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async set(key, value, expireSeconds = null) {
    if (!this.isConnected) {
      console.error('Redis not connected');
      return false;
    }
    
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      
      if (expireSeconds) {
        await this.client.set(key, stringValue, 'EX', expireSeconds);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error.message);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      console.error('Redis not connected');
      return null;
    }
    
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      console.error('Redis not connected');
      return false;
    }
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis delete error:', error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected) {
      console.error('Redis not connected');
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error.message);
      return false;
    }
  }

  async keys(pattern) {
    if (!this.isConnected) {
      console.error('Redis not connected');
      return [];
    }
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis keys error:', error.message);
      return [];
    }
  }

  async healthCheck() {
    if (!this.isConnected) {
      return false;
    }
    
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      console.error('Redis health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new RedisClient();
