const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const stravaAuth = require('./services/stravaAuth');
const { initializeData, healthCheck } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize data on startup
initializeData().then(() => {
  console.log('Data initialization completed');
});

// Routes
app.use('/', authRoutes);
app.use('/', streakRoutes);
app.use('/', statsRoutes);
app.use('/', webhookRoutes);
app.use('/', manualRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisHealth = await healthCheck();
  const status = redisHealth ? 200 : 500;
  res.status(status).json({
    status: redisHealth ? 'OK' : 'Error',
    redis: redisHealth ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Home route
app.get('/', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const authStatus = tokenInfo.hasTokens 
      ? `<p>Authenticated as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname} | <a href="/auth/status">Auth Status</a> | <a href="/auth/logout">Logout</a></p>`
      : '<p>Not authenticated | <a href="/auth/strava">Authenticate with Strava</a> | <a href="/auth/status">Auth Status</a></p>';
    
    res.send(`
      <h1>Strava Run Streak Updater</h1>
      ${authStatus}
      <p>Visit <a href="/update-streak">/update-streak</a> to update your streak</p>
      <p>Visit <a href="/streak-status">/streak-status</a> to check current streak</p>
      <p>Visit <a href="/streak-details">/streak-details</a> for detailed streak info</p>
      <p>Visit <a href="/stats">/stats</a> to view running statistics</p>
      <p>Visit <a href="/manual-streak-update">/manual-streak-update</a> to manually adjust streak</p>
      <p>Visit <a href="/manual-stats-update">/manual-stats-update</a> to manually adjust stats</p>
      <p>Visit <a href="/setup-webhook">/setup-webhook</a> to setup automatic updates</p>
      <p>Visit <a href="/health">/health</a> to check system status</p>
    `);
  } catch (error) {
    res.send(`
      <h1>Strava Run Streak Updater</h1>
      <p>Error checking authentication status: ${error.message}</p>
      <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
    `);
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  
  // Test Redis connection
  const redisHealthy = await healthCheck();
  if (redisHealthy) {
    console.log('Redis connection established successfully');
  } else {
    console.log('Redis connection failed');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
