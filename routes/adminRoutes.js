const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { healthCheck, loadStatsData, loadStreakData, saveStatsData, saveStreakData, getLastActivity, saveLastActivity } = require('../config/storage');
const router = express.Router();

// Refresh last activity from Strava
router.post('/refresh-last-activity', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.redirect('/auth/strava');
    }
    
    const activities = await stravaApi.getRecentActivities(1);
    
    if (activities.length > 0) {
      const activity = activities[0];
      
      await saveLastActivity({
        id: activity.id,
        date: activity.start_date,
        type: activity.type,
        distance: activity.distance
      });
      
      console.log('Refreshed last activity from Strava:', activity.id, activity.type);
      res.redirect('/xapp?message=Latest activity refreshed from Strava');
    } else {
      res.redirect('/xapp?error=No activities found on Strava');
    }
  } catch (error) {
    console.error('Error refreshing last activity:', error.message);
    res.redirect('/xapp?error=Failed to refresh activity: ' + error.message);
  }
});

// Toggle stats manual mode
router.post('/toggle-stats-mode', async (req, res) => {
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
router.post('/toggle-streak-mode', async (req, res) => {
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
router.get('/xapp', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const statsData = await loadStatsData();
    const streakData = await loadStreakData();
    const lastActivity = await getLastActivity();
    const redisHealth = await healthCheck();
    
    const message = req.query.message;
    const error = req.query.error;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin - Strava Run Streak</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; line-height: 1.6; padding: 20px; }
          
          .container { max-width: 1000px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 2rem; }
          .header h1 { color: #1f2937; margin-bottom: 1rem; }
          
          .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .status-card { background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .status-card h3 { margin-bottom: 0.5rem; color: #374151; }
          
          .btn { display: inline-block; padding: 0.5rem 1rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; border: none; cursor: pointer; margin: 0.25rem; }
          .btn:hover { background: #2563eb; }
          .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.875rem; }
          .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #374151; }
          .btn-outline:hover { background: #f9fafb; }
          
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1rem 0; }
          .stat { text-align: center; padding: 1rem; background: #f9fafb; border-radius: 8px; }
          .stat-value { font-size: 1.5rem; font-weight: bold; color: #3b82f6; }
          .stat-label { font-size: 0.875rem; color: #6b7280; }
          
          .actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
          .action-card { background: white; padding: 1.5rem; border-radius: 8px; text-align: center; 
                       box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; }
          .action-card:hover { transform: translateY(-2px); }
          .action-card i { font-size: 2rem; color: #3b82f6; margin-bottom: 1rem; }
          
          .toggle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
          .toggle-item { background: #f9fafb; padding: 1rem; border-radius: 8px; display: flex; 
                       justify-content: space-between; align-items: center; }
          
          .success { color: #10b981; }
          .error { color: #ef4444; }
          .warning { color: #f59e0b; }
          
          .message { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          .message.success { background: #ecfdf5; border: 1px solid #10b981; }
          .message.error { background: #fef2f2; border: 1px solid #ef4444; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><i class="fas fa-running"></i> Strava Run Streak Admin</h1>
          </div>

          ${message ? `<div class="message success">${message}</div>` : ''}
          ${error ? `<div class="message error">${error}</div>` : ''}

          <div class="status-grid">
            <div class="status-card">
              <h3>Authentication</h3>
              <p>${tokenInfo.hasTokens ? 
                `<span class="success">Connected as ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname}</span><br>
                 <a href="/auth/status" class="btn btn-sm btn-outline">Account</a>
                 <a href="/auth/logout" class="btn btn-sm btn-outline">Logout</a>` : 
                `<span class="error">Not authenticated</span><br>
                 <a href="/auth/strava" class="btn btn-sm">Connect Strava</a>`}
              </p>
            </div>
            
            <div class="status-card">
              <h3>Redis Status</h3>
              <p>${redisHealth ? 
                `<span class="success">Connected to Upstash</span>` : 
                `<span class="error">Disconnected</span><br>
                 <a href="/redis-status" class="btn btn-sm btn-outline">Check</a>`}
              </p>
            </div>
            
            <div class="status-card">
              <h3>Last Activity</h3>
              <p>${lastActivity.date ? 
                `${new Date(lastActivity.date).toLocaleString()} (${lastActivity.type})<br>
                 <form action="/refresh-last-activity" method="POST" style="display: inline;">
                   <button type="submit" class="btn btn-sm">Refresh</button>
                 </form>` : 
                `None recorded<br>
                 <form action="/refresh-last-activity" method="POST" style="display: inline;">
                   <button type="submit" class="btn btn-sm">Check Strava</button>
                 </form>`}
              </p>
            </div>
          </div>

          <div class="status-card">
            <h3>Streak Overview</h3>
            <div class="stats-grid">
              <div class="stat">
                <div class="stat-value">${streakData.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${streakData.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${streakData.totalRuns}</div>
                <div class="stat-label">Total Runs</div>
              </div>
            </div>
            <div style="text-align: center; margin-top: 1rem;">
              <a href="/streak-details" class="btn btn-outline">View Details</a>
              <a href="/manual-streak-update" class="btn btn-outline">Manual Update</a>
            </div>
          </div>

          <div class="toggle-grid">
            <div class="toggle-item">
              <div>
                <h3>Stats Update Mode</h3>
                <p>${statsData.manuallyUpdated ? 'Manual - Values preserved' : 'Auto - Updates with runs'}</p>
              </div>
              <form action="/toggle-stats-mode" method="POST">
                <button type="submit" class="btn ${statsData.manuallyUpdated ? '' : 'btn-outline'}">
                  ${statsData.manuallyUpdated ? 'Manual' : 'Auto'}
                </button>
              </form>
            </div>
            
            <div class="toggle-item">
              <div>
                <h3>Streak Update Mode</h3>
                <p>${streakData.manuallyUpdated ? 'Manual - Values preserved' : 'Auto - Updates with runs'}</p>
              </div>
              <form action="/toggle-streak-mode" method="POST">
                <button type="submit" class="btn ${streakData.manuallyUpdated ? '' : 'btn-outline'}">
                  ${streakData.manuallyUpdated ? 'Manual' : 'Auto'}
                </button>
              </form>
            </div>
          </div>

          <div class="actions">
            <a href="/update-strava-activity" class="action-card">
              <i class="fas fa-sync"></i>
              <h3>Update Strava</h3>
              <p>Refresh latest activity</p>
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

          <div class="status-card">
            <h3>Maintenance</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
              <a href="/manual-streak-update" class="btn btn-outline">Manual Streak Update</a>
              <a href="/manual-stats-update" class="btn btn-outline">Manual Stats Update</a>
              <a href="/update-strava-activity" class="btn btn-outline">Update Latest Activity</a>
              <a href="/health" class="btn btn-outline">System Health</a>
              <a href="/debug" class="btn btn-outline">Debug Dashboard</a>
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

module.exports = router;
