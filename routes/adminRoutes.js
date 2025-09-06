const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { healthCheck, loadStreakStats, saveStreakStats, getLastActivity, saveLastActivity } = require('../config/storage');
const { formatTime, metersToKm } = require('../utils/formatters');
const router = express.Router();

// Refresh last activity from Strava
router.post('/refresh-last-activity', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.redirect('/auth/strava');
    }
    
    // Use the improved saveLastActivity function which fetches the latest
    const result = await saveLastActivity(); // Call without parameters to trigger auto-fetch
    
    if (result) {
      // Get the newly saved activity to confirm
      const lastActivity = await getLastActivity();
      console.log('Refreshed last activity from Strava:', lastActivity.id, lastActivity.type);
      res.redirect('/xapp?message=Latest activity refreshed from Strava');
    } else {
      res.redirect('/xapp?error=Failed to refresh latest activity');
    }
  } catch (error) {
    console.error('Error refreshing last activity:', error.message);
    res.redirect('/xapp?error=Failed to refresh activity: ' + error.message);
  }
});

// Toggle manual mode
router.post('/toggle-manual-mode', async (req, res) => {
  try {
    const streakStats = await loadStreakStats();
    streakStats.manuallyUpdated = !streakStats.manuallyUpdated;
    streakStats.lastUpdated = new Date().toISOString();
    
    await saveStreakStats(streakStats);
    res.redirect('/xapp');
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Admin App Interface
router.get('/xapp', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    const streakStats = await loadStreakStats();
    const lastActivity = await getLastActivity();
    const redisHealth = await healthCheck();
    
    // Get the latest activity description from Strava
    let latestDescription = 'No description available';
    try {
      if (lastActivity.id) {
        const activity = await stravaApi.getActivity(lastActivity.id);
        latestDescription = activity.description || 'No description available';
      }
    } catch (error) {
      console.error('Error fetching activity description:', error.message);
      latestDescription = 'Error loading description';
    }
    
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
          
          .toggle-item { background: #f9fafb; padding: 1rem; border-radius: 8px; display: flex; 
                       justify-content: space-between; align-items: center; margin: 1rem 0; }
          
          .success { color: #10b981; }
          .error { color: #ef4444; }
          
          .message { padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          .message.success { background: #ecfdf5; border: 1px solid #10b981; }
          .message.error { background: #fef2f2; border: 1px solid #ef4444; }
          
          .description-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem; margin: 1rem 0; }
          .description-box h3 { margin-bottom: 0.5rem; color: #495057; }
          .description-content { white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; line-height: 1.4; }
          .description-meta { font-size: 0.8rem; color: #6c757d; margin-top: 0.5rem; }
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
                 ${lastActivity.distance ? `${metersToKm(lastActivity.distance)} km` : ''}<br>
                 ID: ${lastActivity.id}<br>
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
                <div class="stat-value">${streakStats.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${streakStats.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
              </div>
              <div class="stat">
                <div class="stat-value">${streakStats.totalRuns}</div>
                <div class="stat-label">Total Runs</div>
              </div>
            </div>
          </div>

          <!-- Latest Description Box -->
          <div class="description-box">
            <h3><i class="fas fa-file-alt"></i> Latest Strava Description</h3>
            <div class="description-content">${latestDescription.replace(/\n/g, '<br>')}</div>
            <div class="description-meta">
              ${lastActivity.date ? `From activity on ${new Date(lastActivity.date).toLocaleDateString()}` : 'No activity data'}
              ${lastActivity.distance ? ` • ${metersToKm(lastActivity.distance)} km` : ''}
              ${lastActivity.id ? ` • ID: ${lastActivity.id}` : ''}
            </div>
          </div>

          <div class="toggle-item">
            <div>
              <h3>Update Mode</h3>
              <p>${streakStats.manuallyUpdated ? 'Manual - Values preserved' : 'Auto - Updates with runs'}</p>
            </div>
            <form action="/toggle-manual-mode" method="POST">
              <button type="submit" class="btn ${streakStats.manuallyUpdated ? '' : 'btn-outline'}">
                ${streakStats.manuallyUpdated ? 'Manual' : 'Auto'}
              </button>
            </form>
          </div>

          <div class="actions">
            <a href="/update-streakstats" class="action-card">
              <i class="fas fa-sync-alt"></i>
              <h3>Update Everything</h3>
              <p>Process new runs & stats</p>
            </a>
            
            <a href="/push-to-strava" class="action-card">
              <i class="fas fa-sync"></i>
              <h3>Update Strava</h3>
              <p>Refresh activity description</p>
            </a>
            
            <a href="/manual-streakstats-update" class="action-card">
              <i class="fas fa-edit"></i>
              <h3>Manual Update</h3>
              <p>Edit values manually</p>
            </a>
            
            <a href="/debug" class="action-card">
              <i class="fas fa-bug"></i>
              <h3>Debug</h3>
              <p>Troubleshooting tools</p>
            </a>
          </div>

          <div class="status-card">
            <h3>Quick Actions</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
              <a href="/update" class="btn btn-outline">Complete Update</a>
              <a href="/manual-streakstats-update" class="btn btn-outline">Manual Edit</a>
              <a href="/push-to-strava" class="btn btn-outline">Push to Strava</a>
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
