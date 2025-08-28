const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const debugRoutes = require('./routes/debugRoutes');
const stravaAuth = require('./services/stravaAuth');
const { initializeData, healthCheck, loadStatsData, loadStreakData, saveStatsData, saveStreakData } = require('./config/storage');

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
app.post('/toggle-stats-mode', async (req, res) => {
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
app.post('/toggle-streak-mode', async (req, res) => {
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

// Save both modes
app.post('/save-modes', async (req, res) => {
  try {
    const { statsMode, streakMode } = req.body;
    
    // Update stats mode
    const statsData = await loadStatsData();
    statsData.manuallyUpdated = statsMode === 'manual';
    statsData.lastUpdated = new Date().toISOString();
    await saveStatsData(statsData);
    
    // Update streak mode
    const streakData = await loadStreakData();
    streakData.manuallyUpdated = streakMode === 'manual';
    streakData.lastManualUpdate = new Date().toISOString();
    await saveStreakData(streakData);
    
    res.send(`
      <h1>Modes Saved Successfully ✅</h1>
      <p><strong>Stats:</strong> ${statsMode === 'manual' ? 'Manual (values preserved)' : 'Auto (updates with runs)'}</p>
      <p><strong>Streak:</strong> ${streakMode === 'manual' ? 'Manual (values preserved)' : 'Auto (updates with runs)'}</p>
      <p><a href="/">Back to Home</a></p>
    `);
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
    
    const authStatus = tokenInfo.hasTokens 
      ? `<p>Authenticated as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname} | <a href="/auth/status">Auth Status</a> | <a href="/auth/logout">Logout</a></p>`
      : '<p>Not authenticated | <a href="/auth/strava">Authenticate with Strava</a> | <a href="/auth/status">Auth Status</a></p>';
    
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
          .mode-section { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .mode-toggle { display: flex; align-items: center; margin: 10px 0; }
          .mode-toggle label { flex: 1; }
          .mode-toggle form { margin-left: 10px; }
          button { padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .form-group { margin: 10px 0; }
          .form-group label { display: inline-block; width: 150px; }
        </style>
      </head>
      <body>
        <h1>Strava Run Streak Updater</h1>
        ${redisStatus}
        ${authStatus}
        
        <div class="mode-section">
          <h2>Current Update Modes</h2>
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
        
        <div class="mode-section">
          <h2>Set Both Modes</h2>
          <form action="/save-modes" method="POST">
            <div class="form-group">
              <label for="statsMode">Stats Update Mode:</label>
              <select id="statsMode" name="statsMode">
                <option value="auto" ${!statsData.manuallyUpdated ? 'selected' : ''}>Auto (update with runs)</option>
                <option value="manual" ${statsData.manuallyUpdated ? 'selected' : ''}>Manual (preserve my values)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="streakMode">Streak Update Mode:</label>
              <select id="streakMode" name="streakMode">
                <option value="auto" ${!streakData.manuallyUpdated ? 'selected' : ''}>Auto (update with runs)</option>
                <option value="manual" ${streakData.manuallyUpdated ? 'selected' : ''}>Manual (preserve my values)</option>
              </select>
            </div>
            <button type="submit">Save Both Modes</button>
          </form>
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
