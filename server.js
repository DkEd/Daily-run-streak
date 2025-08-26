const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const redisClient = require('./config/redis'); // Import Redis client

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Simple middleware to ensure Redis is connected
app.use(async (req, res, next) => {
  if (!redisClient.client || !redisClient.client.isOpen) {
    console.log('Reconnecting to Redis...');
    await redisClient.connect();
  }
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', streakRoutes);
app.use('/', statsRoutes);
app.use('/', webhookRoutes);
app.use('/', manualRoutes);

// Home route
app.get('/', async (req, res) => {
  try {
    // Test Redis connection
    const redisStatus = redisClient.client && redisClient.client.isOpen 
      ? 'Connected' 
      : 'Disconnected';
    
    res.send(`
      <h1>Strava Run Streak Updater</h1>
      <p><strong>Redis Status:</strong> ${redisStatus}</p>
      <p>Visit <a href="/update-streak">/update-streak</a> to update your streak</p>
      <p>Visit <a href="/streak-status">/streak-status</a> to check current streak</p>
      <p>Visit <a href="/streak-details">/streak-details</a> for detailed streak info</p>
      <p>Visit <a href="/stats">/stats</a> to view running statistics</p>
      <p>Visit <a href="/manual-streak-update">/manual-streak-update</a> to manually adjust streak</p>
      <p>Visit <a href="/manual-stats-update">/manual-stats-update</a> to manually adjust stats</p>
      <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
      <p>Visit <a href="/auth/status">/auth/status</a> to check authentication status</p>
      <p>Visit <a href="/setup-webhook">/setup-webhook</a> to setup automatic updates</p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisStatus = redisClient.client && redisClient.client.isOpen 
      ? 'connected' 
      : 'disconnected';
    
    res.json({
      status: 'ok',
      redis: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in Redis`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  
  // Ensure Redis is connected
  if (!redisClient.client || !redisClient.client.isOpen) {
    console.log('Connecting to Redis...');
    await redisClient.connect();
  }
});
