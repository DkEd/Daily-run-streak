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
    res.send('<h1>Redis Status: Connected to Upstash ✅</h1><a href="/xapp">Back to App</a>');
  } else {
    res.status(500).send('<h1>Redis Status: Disconnected ❌</h1><p>Check your Redis configuration</p><a href="/xapp">Back to App</a>');
  }
});

// Toggle stats manual mode
app.post('/toggle-stats-mode', async (req, res) => {
  try {
    const statsData = await loadStatsData();
    statsData.manuallyUpdated = !statsData.manuallyUpdated;
    statsData.lastUpdated = new Date().toISOString();
    
    await saveStatsData(statsData);
    res.redirect('/xapp');
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Toggle streak manual mode  
app.post('/toggle-streak-mode', async (req, res) => {
  try {
    const streakData = await loadStreakData();
    streakData.manuallyUpdated = !streakData.manuallyUpdated;
    streakData.lastManualUpdate = new Date().toISOString();
    
    await saveStreakData(streakData);
    res.redirect('/xapp');
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Admin App Interface
app.get('/xapp', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const statsData = await loadStatsData();
    const streakData = await loadStreakData();
    const redisHealth = await healthCheck();
    
    const authStatus = tokenInfo.hasTokens 
      ? `<div class="auth-status connected">
           <span class="status-dot"></span>
           Connected as: ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname}
           <a href="/auth/status" class="btn btn-sm btn-outline">Account</a>
           <a href="/auth/logout" class="btn btn-sm btn-outline">Logout</a>
         </div>`
      : `<div class="auth-status disconnected">
           <span class="status-dot"></span>
           Not authenticated
           <a href="/auth/strava" class="btn btn-sm btn-primary">Connect Strava</a>
         </div>`;
    
    const redisStatus = redisHealth 
      ? `<div class="status-item success">
           <span class="status-dot"></span>
           Redis: Connected
         </div>`
      : `<div class="status-item error">
           <span class="status-dot"></span>
           Redis: Disconnected
           <a href="/redis-status" class="btn btn-sm btn-outline">Check</a>
         </div>`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin - Strava Run Streak</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          :root {
            --primary: #667eea;
            --secondary: #764ba2;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --dark: #1f2937;
            --light: #f8fafc;
            --gray: #6b7280;
            --border: #e5e7eb;
          }
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1f2937; line-height: 1.6; }
          
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 2rem; }
          .header h1 { color: var(--dark); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.75rem; }
          .header h1 i { color: var(--primary); }
          
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
          .card { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .card-header { display: flex; justify-content: between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid var(--border); }
          .card-header h2 { color: var(--dark); font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
          
          .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
          .status-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--light); border-radius: 8px; }
          .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
          .status-dot.success { background: var(--success); }
          .status-dot.error { background: var(--error); }
          .status-dot.warning { background: var(--warning); }
          
          .auth-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem; }
          .auth-status.connected { border-left: 4px solid var(--success); }
          .auth-status.disconnected { border-left: 4px solid var(--error); }
          
          .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-weight: 500; transition: all 0.2s; border: none; cursor: pointer; }
          .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
          .btn-primary { background: var(--primary); color: white; }
          .btn-primary:hover { background: #5a67d8; }
          .btn-outline { background: transparent; border: 1px solid var(--border); color: var(--gray); }
          .btn-outline:hover { background: var(--light); border-color: var(--gray); }
          .btn-success { background: var(--success); color: white; }
          .btn-success:hover { background: #059669; }
          .btn-warning { background: var(--warning); color: white; }
          .btn-warning:hover { background: #d97706; }
          
          .mode-toggle { display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem; }
          .mode-toggle:last-child { margin-bottom: 0; }
          .mode-info { flex: 1; }
          .mode-info h3 { font-size: 1rem; margin-bottom: 0.25rem; }
          .mode-info p { font-size: 0.875rem; color: var(--gray); }
          
          .switch { position: relative; display: inline-block; width: 50px; height: 24px; }
          .switch input { opacity: 0; width: 0; height: 0; }
          .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--gray); transition: .4s; border-radius: 24px; }
          .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
          input:checked + .slider { background-color: var(--success); }
          input:checked + .slider:before { transform: translateX(26px); }
          
          .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
          .action-card { background: var(--light); padding: 1.25rem; border-radius: 8px; text-align: center; transition: transform 0.2s; }
          .action-card:hover { transform: translateY(-2px); }
          .action-card i { font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--primary); }
          .action-card h3 { font-size: 0.875rem; margin-bottom: 0.5rem; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
          .stat-item { text-align: center; padding: 1rem; background: var(--light); border-radius: 8px; }
          .stat-value { font-size: 1.5rem; font-weight: bold; color: var(--primary); }
          .stat-label { font-size: 0.875rem; color: var(--gray); }
          
          @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .status-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><i class="fas fa-running"></i> Strava Run Streak Admin</h1>
            <div class="status-grid">
              ${authStatus}
              ${redisStatus}
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-cog"></i> Update Modes</h2>
              </div>
              
              <div class="mode-toggle">
                <div class="mode-info">
                  <h3>Stats Update Mode</h3>
                  <p>${statsData.manuallyUpdated ? 'Manual - Your values are preserved' : 'Auto - Updates with new runs'}</p>
                </div>
                <form action="/toggle-stats-mode" method="POST" style="display: inline;">
                  <label class="switch">
                    <input type="checkbox" ${statsData.manuallyUpdated ? 'checked' : ''} onchange="this.form.submit()">
                    <span class="slider"></span>
                  </label>
                </form>
              </div>
              
              <div class="mode-toggle">
                <div class="mode-info">
                  <h3>Streak Update Mode</h3>
                  <p>${streakData.manuallyUpdated ? 'Manual - Your values are preserved' : 'Auto - Updates with new runs'}</p>
                </div>
                <form action="/toggle-streak-mode" method="POST" style="display: inline;">
                  <label class="switch">
                    <input type="checkbox" ${streakData.manuallyUpdated ? 'checked' : ''} onchange="this.form.submit()">
                    <span class="slider"></span>
                  </label>
                </form>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-fire"></i> Streak Overview</h2>
              </div>
              
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">${streakData.currentStreak}</div>
                  <div class="stat-label">Current Streak</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${streakData.longestStreak}</div>
                  <div class="stat-label">Longest Streak</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${streakData.totalRuns}</div>
                  <div class="stat-label">Total Runs</div>
                </div>
              </div>
              
              <div style="margin-top: 1rem;">
                <a href="/streak-details" class="btn btn-outline btn-sm">
                  <i class="fas fa-chart-bar"></i> View Details
                </a>
                <a href="/manual-streak-update" class="btn btn-outline btn-sm">
                  <i class="fas fa-edit"></i> Manual Update
                </a>
              </div>
            </div>
          </div>
          
          <div class="grid">
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-tachometer-alt"></i> Quick Actions</h2>
              </div>
              
              <div class="actions-grid">
                <a href="/update-streak" class="action-card">
                  <i class="fas fa-sync-alt"></i>
                  <h3>Update Streak</h3>
                  <p>Process today's runs</p>
                </a>
                
                <a href="/stats" class="action-card">
                  <i class="fas fa-chart-line"></i>
                  <h3>View Stats</h3>
                  <p>Running statistics</p>
                </a>
                
                <a href="/setup-webhook" class="action-card">
                  <i class="fas fa-plug"></i>
                  <h3>Setup Webhook</h3>
                  <p>Automatic updates</p>
                </a>
                
                <a href="/debug" class="action-card">
                  <i class="fas fa-bug"></i>
                  <h3>Debug</h3>
                  <p>Troubleshooting tools</p>
                </a>
              </div>
            </div>
            
            <div class="card">
              <div class="card-header">
                <h2><i class="fas fa-wrench"></i> Maintenance</h2>
              </div>
              
              <div style="display: grid; gap: 0.75rem;">
                <a href="/manual-streak-update" class="btn btn-outline">
                  <i class="fas fa-edit"></i> Manual Streak Update
                </a>
                <a href="/manual-stats-update" class="btn btn-outline">
                  <i class="fas fa-sliders-h"></i> Manual Stats Update
                </a>
                <a href="/health" class="btn btn-outline">
                  <i class="fas fa-heartbeat"></i> System Health
                </a>
                <a href="/debug" class="btn btn-outline">
                  <i class="fas fa-tools"></i> Debug Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>Error Loading Admin</h1>
      <p>${error.message}</p>
      <a href="/auth/strava">Connect Strava</a>
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
