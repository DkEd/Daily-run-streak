const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { updateStreakStatsWithRun, manuallyUpdateStreakStats, pushToStravaDescription, loadStreakStats } = require('../controllers/streakstatsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm } = require('../utils/formatters');
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
      <h1>StreakStats Updated</h1>
      <p><strong>Current Streak:</strong> ${result.currentStreak} days</p>
      <p><strong>Total Runs:</strong> ${result.totalRuns}</p>
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
    const result = await pushToStravaDescription();
    res.send(`
      <h1>Strava Description Updated</h1>
      <p>${result.success ? 'Successfully updated activity description' : result.message}</p>
      <p><a href="/xapp">Back to Admin</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

// Manual update page
router.get('/manual-streakstats-update', async (req, res) => {
  try {
    const streakStats = await loadStreakStats();
    
    res.send(`
      <h1>Manual StreakStats Update</h1>
      <form action="/manual-streakstats-update" method="POST">
        <h3>Streak Data</h3>
        <label for="currentStreak">Current Streak (days):</label>
        <input type="number" id="currentStreak" name="currentStreak" value="${streakStats.currentStreak}" required>
        <br>
        <label for="longestStreak">Longest Streak (days):</label>
        <input type="number" id="longestStreak" name="longestStreak" value="${streakStats.longestStreak}" required>
        <br>
        <label for="lastRunDate">Last Run Date (YYYY-MM-DD):</label>
        <input type="date" id="lastRunDate" name="lastRunDate" value="${streakStats.lastRunDate || ''}">
        
        <h3>Totals</h3>
        <label for="totalRuns">Total Runs:</label>
        <input type="number" id="totalRuns" name="totalRuns" value="${streakStats.totalRuns}" required>
        <br>
        <label for="totalDistance">Total Distance (km):</label>
        <input type="number" step="0.1" id="totalDistance" name="totalDistance" value="${metersToKm(streakStats.totalDistance)}" required>
        <br>
        <label for="totalElevation">Total Elevation (meters):</label>
        <input type="number" id="totalElevation" name="totalElevation" value="${streakStats.totalElevation}" required>
        
        <h3>Monthly Stats</h3>
        <label for="monthlyDistance">Monthly Distance (km):</label>
        <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="${metersToKm(streakStats.monthlyDistance)}" required>
        <br>
        <label for="monthlyElevation">Monthly Elevation (meters):</label>
        <input type="number" id="monthlyElevation" name="monthlyElevation" value="${streakStats.monthlyElevation}" required>
        <br>
        <label for="monthlyGoal">Monthly Goal (km):</label>
        <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="${metersToKm(streakStats.monthlyGoal)}" required>
        
        <h3>Yearly Stats</h3>
        <label for="yearlyDistance">Yearly Distance (km):</label>
        <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="${metersToKm(streakStats.yearlyDistance)}" required>
        <br>
        <label for="yearlyElevation">Yearly Elevation (meters):</label>
        <input type="number" id="yearlyElevation" name="yearlyElevation" value="${streakStats.yearlyElevation}" required>
        <br>
        <label for="yearlyGoal">Yearly Goal (km):</label>
        <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="${metersToKm(streakStats.yearlyGoal)}" required>
        <br>
        <label for="manuallyUpdated">Update Mode:</label>
        <select id="manuallyUpdated" name="manuallyUpdated">
          <option value="true" ${streakStats.manuallyUpdated ? 'selected' : ''}>Manual (preserve my values)</option>
          <option value="false" ${!streakStats.manuallyUpdated ? 'selected' : ''}>Auto (update with runs)</option>
        </select>
        <br>
        <button type="submit">Update StreakStats</button>
      </form>
      <a href="/xapp">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

router.post('/manual-streakstats-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStreakStats(req.body);
    res.send(`<h1>Manual Update Result</h1><p>StreakStats updated manually. Your values will be preserved.</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/xapp">App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

module.exports = router;
