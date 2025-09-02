const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { updateStreakStatsWithRun, manuallyUpdateStreakStats, pushToStravaDescription, loadStreakStats } = require('../controllers/streakstatsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm, formatTime } = require('../utils/formatters');
const { loadStreakStats: loadFromStorage, saveStreakStats, saveLastActivity } = require('../config/storage');

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
    const result = await updateStreakStatsWithRun(activities[0] || null, {
      loadStreakStats: loadFromStorage,
      saveStreakStats: saveStreakStats
    });
    
    res.send(`
      <h1>StreakStats Updated</h1>
      <p><strong>Current Streak:</strong> ${result.currentStreak} days</p>
      <p><strong>Total Runs:</strong> ${result.totalRuns}</p>
      <p><strong>Total Time:</strong> ${formatTime(result.totalTime)}</p>
      <p><strong>Last Run:</strong> ${result.lastRunDate || 'Never'}</p>
      <p><a href="/xapp">Back to Admin</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Push to Strava description
router.get('/push-to-strava', async (req, res) => {
  try {
    const result = await pushToStravaDescription(null, {
      loadStreakStats: loadFromStorage,
      saveLastActivity: saveLastActivity
    });
    res.send(`
      <h1>Strava Description Updated</h1>
      <p>${result.success ? 'Successfully updated activity description' : result.message}</p>
      <p><a href="/xapp">Back to Admin</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Manual update page WITH TOTAL TIME FIELD
router.get('/manual-streakstats-update', async (req, res) => {
  try {
    const streakStats = await loadFromStorage();
    
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
          h1 { color: #1f2937; margin-bottom: 1rem; }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
          input, select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; width: 100%; }
          button { padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; 
                  border-radius: 6px; cursor: pointer; margin-top: 1rem; }
          button:hover { background: #2563eb; }
          .btn { display: inline-block; padding: 0.5rem 1rem; background: #6b7280; color: white; 
                text-decoration: none; border-radius: 6px; margin-right: 0.5rem; }
          .help-text { font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Manual StreakStats Update</h1>
          
          <form action="/manual-streakstats-update" method="POST">
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
              <div class="help-text">Current: ${formatTime(streakStats.totalTime || 0)}</div>
            </div>
            
            <div class="form-group">
              <label for="totalElevation">Total Elevation (meters):</label>
              <input type="number" id="totalElevation" name="totalElevation" value="${streakStats.totalElevation}" required>
            </div>
            
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
            <a href="/update-streakstats" class="btn">Auto Update</a>
            <a href="/push-to-strava" class="btn">Push to Strava</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

router.post('/manual-streakstats-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStreakStats(req.body, {
      loadStreakStats: loadFromStorage,
      saveStreakStats: saveStreakStats
    });
    res.send(`
      <h1>Manual Update Result</h1>
      <p>StreakStats updated manually. Your values will be preserved.</p>
      <p><strong>Total Time:</strong> ${formatTime(result.data.totalTime)}</p>
      <pre>${JSON.stringify(result.data, null, 2)}</pre>
      <a href="/manual-streakstats-update">Edit Again</a> | 
      <a href="/xapp">Back to Admin</a> | 
      <a href="/push-to-strava">Push to Strava</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

module.exports = router;
