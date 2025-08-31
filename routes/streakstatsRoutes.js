const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { updateStreakStatsWithRun, manuallyUpdateStreakStats, pushToStravaDescription, loadStreakStats } = require('../controllers/streakstatsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm, formatTime } = require('../utils/formatters');
const router = express.Router();

// Apply middleware
router.use(refreshDataMiddleware);

// Unified update endpoint
router.get('/update-streakstats', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    const activities = await stravaApi.getRecentActivities(1);
    const result = await updateStreakStatsWithRun(activities[0] || null);
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StreakStats Updated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .stat { display: inline-block; padding: 1rem; margin: 0.5rem; background: #f9fafb; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 1.5rem; font-weight: bold; color: #3b82f6; }
          .stat-label { font-size: 0.875rem; color: #6b7280; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>StreakStats Updated ✅</h1>
          
          <div class="card">
            <h2>Update Results</h2>
            <div class="stat">
              <div class="stat-value">${result.currentStreak}</div>
              <div class="stat-label">Current Streak</div>
            </div>
            <div class="stat">
              <div class="stat-value">${result.totalRuns}</div>
              <div class="stat-label">Total Runs</div>
            </div>
            <div class="stat">
              <div class="stat-value">${metersToKm(result.totalDistance)}</div>
              <div class="stat-label">Total Distance</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatTime(result.totalTime)}</div>
              <div class="stat-label">Total Time</div>
            </div>
            
            <p><strong>Last Run:</strong> ${result.lastRunDate || 'Never'}</p>
            <p><strong>Mode:</strong> ${result.manuallyUpdated ? 'Manual' : 'Auto'}</p>
          </div>

          <div>
            <a href="/xapp" class="btn">Back to Admin</a>
            <a href="/push-to-strava" class="btn">Update Strava Description</a>
            <a href="/update-streakstats" class="btn">Update Again</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Push to Strava description
router.get('/push-to-strava', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    const result = await pushToStravaDescription();
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Strava Description Updated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .success { color: #10b981; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Strava Description Updated <span class="success">✅</span></h1>
          <p>${result.success ? 'Successfully updated activity description' : result.message}</p>
          ${result.activityId ? `<p><strong>Activity ID:</strong> ${result.activityId}</p>` : ''}
          
          <div style="margin-top: 2rem;">
            <a href="/xapp" class="btn">Back to Admin</a>
            <a href="/update-streakstats" class="btn">Update StreakStats</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Manual update page
router.get('/manual-streakstats-update', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    const streakStats = await loadStreakStats();
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manual StreakStats Update</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
          input, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; width: 100%; }
          button { padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; 
                  border-radius: 6px; cursor: pointer; margin-top: 1rem; }
          button:hover { background: #2563eb; }
          .btn { display: inline-block; padding: 0.5rem 1rem; background: #6b7280; color: white; 
                text-decoration: none; border-radius: 6px; margin-right: 0.5rem; }
          .section { margin-bottom: 2rem; padding: 1rem; background: #f9fafb; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Manual StreakStats Update</h1>
          
          <form action="/manual-streakstats-update" method="POST">
            <div class="section">
              <h3>Streak Data</h3>
              <div class="form-group">
                <label for="currentStreak">Current Streak (days):</label>
                <input type="number" id="currentStreak" name="currentStreak" value="${streakStats.currentStreak}" required>
              </div>
              <div class="form-group">
                <label for="longestStreak">Longest Streak (days):</label>
                <input type="number" id="longestStreak" name="longestStreak" value="${streakStats.longestStreak}" required>
              </div>
              <div class="form-group">
                <label for="lastRunDate">Last Run Date (YYYY-MM-DD):</label>
                <input type="date" id="lastRunDate" name="lastRunDate" value="${streakStats.lastRunDate || ''}">
              </div>
            </div>
            
            <div class="section">
              <h3>Totals</h3>
              <div class="form-group">
                <label for="totalRuns">Total Runs:</label>
                <input type="number" id="totalRuns" name="totalRuns" value="${streakStats.totalRuns}" required>
              </div>
              <div class="form-group">
                <label for="totalDistance">Total Distance (km):</label>
                <input type="number" step="0.1" id="totalDistance" name="totalDistance" value="${metersToKm(streakStats.totalDistance)}" required>
              </div>
              <div class="form-group">
                <label for="totalTime">Total Time (seconds):</label>
                <input type="number" id="totalTime" name="totalTime" value="${streakStats.totalTime || 0}" required>
                <small>Current: ${formatTime(streakStats.totalTime || 0)}</small>
              </div>
              <div class="form-group">
                <label for="totalElevation">Total Elevation (meters):</label>
                <input type="number" id="totalElevation" name="totalElevation" value="${streakStats.totalElevation}" required>
              </div>
            </div>
            
            <div class="section">
              <h3>Monthly Stats</h3>
              <div class="form-group">
                <label for="monthlyDistance">Monthly Distance (km):</label>
                <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="${metersToKm(streakStats.monthlyDistance)}" required>
              </div>
              <div class="form-group">
                <label for="monthlyElevation">Monthly Elevation (meters):</label>
                <input type="number" id="monthlyElevation" name="monthlyElevation" value="${streakStats.monthlyElevation}" required>
              </div>
              <div class="form-group">
                <label for="monthlyGoal">Monthly Goal (km):</label>
                <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="${metersToKm(streakStats.monthlyGoal)}" required>
              </div>
            </div>
            
            <div class="section">
              <h3>Yearly Stats</h3>
              <div class="form-group">
                <label for="yearlyDistance">Yearly Distance (km):</label>
                <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="${metersToKm(streakStats.yearlyDistance)}" required>
              </div>
              <div class="form-group">
                <label for="yearlyElevation">Yearly Elevation (meters):</label>
                <input type="number" id="yearlyElevation" name="yearlyElevation" value="${streakStats.yearlyElevation}" required>
              </div>
              <div class="form-group">
                <label for="yearlyGoal">Yearly Goal (km):</label>
                <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="${metersToKm(streakStats.yearlyGoal)}" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="manuallyUpdated">Update Mode:</label>
              <select id="manuallyUpdated" name="manuallyUpdated">
                <option value="true" ${streakStats.manuallyUpdated ? 'selected' : ''}>Manual (preserve my values)</option>
                <option value="false" ${!streakStats.manuallyUpdated ? 'selected' : ''}>Auto (update with runs)</option>
              </select>
            </div>
            
            <button type="submit">Update StreakStats</button>
          </form>
          
          <div style="margin-top: 2rem;">
            <a href="/xapp" class="btn">Back to Admin</a>
            <a href="/push-to-strava" class="btn">Update Strava Description</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.post('/manual-streakstats-update', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    const result = await manuallyUpdateStreakStats(req.body);
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Manual Update Result</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .success { color: #10b981; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Manual Update Result <span class="success">✅</span></h1>
          <p>StreakStats updated manually. Your values will be preserved.</p>
          
          <h2>Updated Data:</h2>
          <pre>${JSON.stringify(result.data, null, 2)}</pre>
          
          <div style="margin-top: 2rem;">
            <a href="/xapp" class="btn">Back to Admin</a>
            <a href="/push-to-strava" class="btn">Update Strava Description</a>
            <a href="/manual-streakstats-update" class="btn">Edit Again</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

module.exports = router;
