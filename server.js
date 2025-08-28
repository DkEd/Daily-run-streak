const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const debugRoutes = require('./routes/debugRoutes');
const stravaAuth = require('./services/stravaAuth');
const { initializeData, healthCheck, loadStatsData, loadStreakData, saveStatsData, saveStreakData } = require('./config/storage');
const { checkAuth, requireAuth } = require('./middleware/authCheck');

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

// Authentication check middleware (runs on every request)
app.use(checkAuth);

// Routes - Protect routes that modify data
app.use('/', authRoutes);
app.use('/', requireAuth, streakRoutes); // Protect all streak routes
app.use('/', statsRoutes);
app.use('/', webhookRoutes); // Webhooks don't need auth protection
app.use('/', requireAuth, manualRoutes); // Protect all manual routes
app.use('/', debugRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisHealth = await healthCheck();
  const status = redisHealth ? 200 : 500;
  res.status(status).json({
    status: redisHealth ? 'OK' : 'Error',
    redis: redisHealth ? 'Connected to Upstash' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Redis connection status endpoint
app.get('/redis-status', async (req, res) => {
  const redisHealth = await healthCheck();
  if (redisHealth) {
    res.send('<h1>Redis Status: Connected to Upstash ✅</h1><a href="/">Home</a>');
  } else {
    res.status(500).send('<h1>Redis Status: Disconnected ❌</h1><p>Check your Redis configuration</p><a href="/">Home</a>');
  }
});

// Toggle stats manual mode
app.post('/toggle-stats-mode', requireAuth, async (req, res) => {
  try {
    const statsData = await loadStatsData();
    statsData.manuallyUpdated = !statsData.manuallyUpdated;
    statsData.lastUpdated = new Date().toISOString();
    
    await saveStatsData(statsData);
    
    const message = `Stats are now ${statsData.manuallyUpdated ? 'manually' : 'automatically'} updated`;
    res.send(`<h1>Stats Mode Changed</h1><p>${message}</p><a href="/">Back to Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

// Toggle streak manual mode  
app.post('/toggle-streak-mode', requireAuth, async (req, res) => {
  try {
    const streakData = await loadStreakData();
    streakData.manuallyUpdated = !streakData.manuallyUpdated;
    streakData.lastManualUpdate = new Date().toISOString();
    
    await saveStreakData(streakData);
    
    const message = `Streak is now ${streakData.manuallyUpdated ? 'manually' : 'automatically'} updated`;
    res.send(`<h1>Streak Mode Changed</h1><p>${message}</p><a href="/">Back to Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

// Home route
app.get('/', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const statsData = await loadStatsData();
    const streakData = await loadStreakData();
    const redisHealth = await healthCheck();
    
    const isAuthorized = res.locals.isAuthorized;
    
    const authStatus = tokenInfo.hasTokens 
      ? `<p>Authenticated as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname} | <a href="/auth/status">Auth Status</a> | <a href="/auth/logout">Logout</a></p>`
      : '<p>Not authenticated | <a href="/auth/strava">Authenticate with Strava</a> | <a href="/auth/status">Auth Status</a></p>';
    
    const redisStatus = redisHealth 
      ? '<p style="color: green;">Upstash Redis: Connected ✅</p>' 
      : '<p style="color: red;">Upstash Redis: Disconnected ❌ - <a href="/redis-status">Check Status</a></p>';
    
    if (isAuthorized) {
      // FULL UI FOR AUTHORIZED USER
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Strava Run Streak Updater</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .mode-section { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .mode-toggle { display: flex; align-items: center; margin: 10px 0; }
            .mode-toggle label { flex: 1; }
            .mode-toggle form { margin-left: 10px; }
            button { padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <h1>Strava Run Streak Updater</h1>
          ${redisStatus}
          ${authStatus}
          
          <div class="mode-section">
            <h2>Update Modes</h2>
            <div class="mode-toggle">
              <label><strong>Stats:</strong> ${statsData.manuallyUpdated ? 'Manual (values preserved)' : 'Auto (updates with runs)'}</label>
              <form action="/toggle-stats-mode" method="POST">
                <button type="submit">Toggle</button>
              </form>
            </div>
            <div class="mode-toggle">
              <label><strong>Streak:</strong> ${streakData.manuallyUpdated ? 'Manual (values preserved)' : 'Auto (updates with runs)'}</label>
              <form action="/toggle-streak-mode" method="POST">
                <button type="submit">Toggle</button>
              </form>
            </div>
          </div>
          
          <h2>Quick Actions</h2>
          <ul>
            <li><a href="/update-streak">Update Streak</a> - Process today's runs</li>
            <li><a href="/streak-status">Streak Status</a> - Check current streak</li>
            <li><a href="/streak-details">Streak Details</a> - Detailed streak info</li>
            <li><a href="/stats">Running Stats</a> - View statistics</li>
            <li><a href="/manual-streak-update">Manual Streak Update</a> - Adjust streak manually</li>
            <li><a href="/manual-stats-update">Manual Stats Update</a> - Adjust stats manually</li>
            <li><a href="/setup-webhook">Setup Webhook</a> - Automatic updates</li>
            <li><a href="/health">System Health</a> - Check status</li>
            <li><a href="/debug">Debug Dashboard</a> - Troubleshooting</li>
          </ul>
        </body>
        </html>
      `);
    } else {
      // READ-ONLY UI FOR UNAUTHORIZED USERS
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Strava Run Streak Updater</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
            .read-only { background: #fff3cd; padding: 20px; border-radius: 5px; border: 1px solid #ffeaa7; }
          </style>
        </head>
        <body>
          <h1>Strava Run Streak Updater</h1>
          
          <div class="read-only">
            <h2>🔒 Access Restricted</h2>
            <p>This tool is for personal use only.</p>
            <p>If you're the owner, please <a href="/auth/strava">authenticate with Strava</a>.</p>
          </div>
          
          <div style="margin-top: 30px;">
            <h3>Current Status</h3>
            <p><strong>Current Streak:</strong> ${streakData.currentStreak} days</p>
            <p><strong>Longest Streak:</strong> ${streakData.longestStreak} days</p>
            <p><strong>Total Runs:</strong> ${streakData.totalRuns}</p>
          </div>
          
          <p style="margin-top: 30px; color: #666;">
            <a href="/auth/strava">Authenticate</a> | 
            <a href="/health">System Status</a>
          </p>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.send(`
      <h1>Strava Run Streak Updater</h1>
      <p>Error loading page: ${error.message}</p>
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
    console.log('Upstash Redis connection established successfully');
  } else {
    console.log('Upstash Redis connection failed - check your REDIS_URL configuration');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
