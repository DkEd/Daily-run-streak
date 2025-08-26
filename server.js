const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const debugRoutes = require('./routes/debugRoutes');
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
}).catch((error) => {
  console.error('Data initialization failed:', error.message);
  console.log('Continuing with in-memory storage...');
});

// Routes
app.use('/', authRoutes);
app.use('/', streakRoutes);
app.use('/', statsRoutes);
app.use('/', webhookRoutes);
app.use('/', manualRoutes);
app.use('/', debugRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    const status = redisHealth ? 200 : 500;
    res.status(status).json({
      status: redisHealth ? 'OK' : 'Error',
      redis: redisHealth ? 'Connected to Upstash' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Redis connection status endpoint
app.get('/redis-status', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    if (redisHealth) {
      res.send('<h1>Redis Status: Connected ✅</h1><a href="/">Home</a>');
    } else {
      res.status(500).send(`
        <h1>Redis Status: Disconnected ❌</h1>
        <p>Check your Redis configuration in the .env file</p>
        <p>REDIS_URL should be in format: redis://default:password@hostname:port</p>
        <a href="/">Home</a>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

// Home route
app.get('/', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const authStatus = tokenInfo.hasTokens 
      ? `<p>Authenticated as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname} | <a href="/auth/status">Auth Status</a> | <a href="/auth/logout">Logout</a></p>`
      : '<p>Not authenticated | <a href="/auth/strava">Authenticate with Strava</a> | <a href="/auth/status">Auth Status</a></p>';
    
    const redisHealth = await healthCheck();
    const redisStatus = redisHealth 
      ? '<p style="color: green;">Upstash Redis: Connected ✅</p>' 
      : '<p style="color: red;">Upstash Redis: Disconnected ❌ - <a href="/redis-status">Check Status</a></p>';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Strava Run Streak Updater</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #fc4c02; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .links { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>Strava Run Streak Updater</h1>
        
        <div class="status">
          ${redisStatus}
          ${authStatus}
        </div>
        
        <div class="links">
          <h2>Main Functions</h2>
          <p>• <a href="/update-streak">Update Streak</a> - Manually update your running streak</p>
          <p>• <a href="/streak-status">Check Current Streak</a> - View your current streak count</p>
          <p>• <a href="/streak-details">Streak Details</a> - Detailed streak information</p>
          <p>• <a href="/stats">Running Statistics</a> - View monthly/yearly stats</p>
          <p>• <a href="/setup-webhook">Setup Webhooks</a> - Configure automatic updates</p>
          
          <h2>Manual Updates</h2>
          <p>• <a href="/manual-streak-update">Manual Streak Update</a> - Manually adjust streak data</p>
          <p>• <a href="/manual-stats-update">Manual Stats Update</a> - Manually adjust running stats</p>
          
          <h2>Debug & Tools</h2>
          <p>• <a href="/debug">Debug Dashboard</a> - System diagnostics and troubleshooting</p>
          <p>• <a href="/health">Health Check</a> - System status overview</p>
          <p>• <a href="/auth/status">Authentication Status</a> - Check Strava connection</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Strava Run Streak Updater</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #fc4c02; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Strava Run Streak Updater</h1>
        <p>Error checking authentication status: ${error.message}</p>
        <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
        <p>Visit <a href="/debug">/debug</a> to troubleshoot issues</p>
      </body>
      </html>
    `);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Page Not Found</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #d32f2f; }
        a { color: #fc4c02; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <p><a href="/">← Return to Home</a></p>
    </body>
    </html>
  `);
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Error</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #d32f2f; }
        a { color: #fc4c02; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>500 - Server Error</h1>
      <p>Something went wrong on our server.</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <p><a href="/">← Return to Home</a> | <a href="/debug">Debug</a></p>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  
  // Test Redis connection
  try {
    const redisHealthy = await healthCheck();
    if (redisHealthy) {
      console.log('Upstash Redis connection established successfully');
    } else {
      console.log('Upstash Redis connection failed - check your REDIS_URL configuration');
      console.log('Expected format: redis://default:password@hostname:port');
    }
  } catch (error) {
    console.log('Redis health check failed:', error.message);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
