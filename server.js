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
    res.send(`<h1>Stats Mode Changed</h1><p>${message}</p><a href="/xapp">Back to App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
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
    res.send(`<h1>Streak Mode Changed</h1><p>${message}</p><a href="/xapp">Back to App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

// New XApp route (admin interface)
app.get('/xapp', async (req, res) => {
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
        <title>Strava Run Streak - Admin</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .mode-section { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .mode-toggle { display: flex; align-items: center; margin: 10px 0; }
          .mode-toggle label { flex: 1; }
          .mode-toggle form { margin-left: 10px; }
          button { padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .nav { background: #333; padding: 10px; margin-bottom: 20px; }
          .nav a { color: white; margin-right: 15px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="nav">
          <a href="/">Home</a>
          <a href="/xapp">App</a>
          <a href="/debug">Debug</a>
        </div>
        
        <h1>Strava Run Streak Admin</h1>
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
  } catch (error) {
    res.send(`
      <h1>Strava Run Streak Admin</h1>
      <p>Error loading page: ${error.message}</p>
      <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
    `);
  }
});

// Home route (public landing page) - NO NAVIGATION, NO LINKS
app.get('/', async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Strava Run Streak Tracker</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
          .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 20px; border-radius: 10px; margin-bottom: 30px; }
          .features { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin: 30px 0; }
          .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; width: 200px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>🏃🏻‍♂️ Strava Run Streak Tracker</h1>
          <p>Track your daily running streak and automatically update your Strava activities with progress stats</p>
        </div>
        
        <h2>Features</h2>
        <div class="features">
          <div class="feature">
            <h3>📊 Daily Streak</h3>
            <p>Track your consecutive days of running</p>
          </div>
          <div class="feature">
            <h3>📈 Progress Stats</h3>
            <p>Monthly and yearly running statistics</p>
          </div>
          <div class="feature">
            <h3>🔄 Auto Updates</h3>
            <p>Automatic activity description updates</p>
          </div>
          <div class="feature">
            <h3>☁️ Cloud Sync</h3>
            <p>Data saved to Redis cloud storage</p>
          </div>
        </div>
        
        <h2>How It Works</h2>
        <p>This app connects to your Strava account to track running activities and maintain your daily running streak counter.</p>
        
        <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee;">
          <p>Powered by Strava API • Data stored securely in Upstash Redis</p>
        </footer>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>Strava Run Streak Tracker</h1>
      <p>Welcome to the Strava Run Streak Tracker</p>
    `);
  }
});

// Privacy policy placeholder
app.get('/privacy', (req, res) => {
  res.send(`
    <h1>Privacy Policy</h1>
    <p>This app only stores your Strava activity data needed to maintain your running streak statistics.</p>
    <p>We never share your data with third parties and only use it to provide the service.</p>
    <p><a href="/">Back to Home</a></p>
  `);
});

// Terms of service placeholder
app.get('/terms', (req, res) => {
  res.send(`
    <h1>Terms of Service</h1>
    <p>By using this app, you agree to comply with Strava's API terms of service.</p>
    <p>This is a personal project for tracking running streaks and not an official Strava product.</p>
    <p><a href="/">Back to Home</a></p>
  `);
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
