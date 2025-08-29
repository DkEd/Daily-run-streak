const express = require('express');
const { manuallyUpdateStreak } = require('../controllers/streakController');
const { manuallyUpdateStats } = require('../controllers/statsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm } = require('../utils/formatters');
const router = express.Router();

// Apply middleware to manual routes
router.use(refreshDataMiddleware);

router.get('/manual-streak-update', async (req, res) => {
  try {
    const { loadStreakData } = require('../config/storage');
    const streakData = await loadStreakData();
    
    res.send(`
      <h1>Manual Streak Update</h1>
      <form action="/manual-streak-update" method="POST">
        <label for="currentStreak">Current Streak (days):</label>
        <input type="number" id="currentStreak" name="currentStreak" value="${streakData.currentStreak}" required>
        <br>
        <label for="longestStreak">Longest Streak (days):</label>
        <input type="number" id="longestStreak" name="longestStreak" value="${streakData.longestStreak}" required>
        <br>
        <label for="totalRuns">Total Runs:</label>
        <input type="number" id="totalRuns" name="totalRuns" value="${streakData.totalRuns}" required>
        <br>
        <label for="totalDistance">Total Distance (km):</label>
        <input type="number" step="0.1" id="totalDistance" name="totalDistance" value="${metersToKm(streakData.totalDistance)}" required>
        <br>
        <label for="totalTime">Total Time (seconds):</label>
        <input type="number" id="totalTime" name="totalTime" value="${streakData.totalTime}" required>
        <br>
        <label for="totalElevation">Total Elevation (meters):</label>
        <input type="number" id="totalElevation" name="totalElevation" value="${streakData.totalElevation}" required>
        <br>
        <label for="streakStartDate">Streak Start Date (YYYY-MM-DD):</label>
        <input type="date" id="streakStartDate" name="streakStartDate" value="${streakData.streakStartDate}" required>
        <br>
        <label for="manuallyUpdated">Manually Updated:</label>
        <select id="manuallyUpdated" name="manuallyUpdated">
          <option value="true" ${streakData.manuallyUpdated ? 'selected' : ''}>Yes (preserve my values)</option>
          <option value="false" ${!streakData.manuallyUpdated ? 'selected' : ''}>No (auto-update)</option>
        </select>
        <br>
        <button type="submit">Update Streak</button>
      </form>
      <a href="/xapp">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

router.post('/manual-streak-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStreak(req.body);
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/streak-details">View Streak</a><br><a href="/xapp">App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

router.get('/manual-stats-update', async (req, res) => {
  try {
    const { loadStatsData } = require('../config/storage');
    const statsData = await loadStatsData();
    
    res.send(`
      <h1>Manual Stats Update</h1>
      <p><strong>Current Mode:</strong> ${statsData.manuallyUpdated ? 'Manual (your values preserved)' : 'Auto (values update with runs)'}</p>
      <form action="/manual-stats-update" method="POST">
        <h3>Monthly Stats</h3>
        <label for="monthlyDistance">Monthly Distance (km):</label>
        <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="${metersToKm(statsData.monthlyDistance)}" required>
        <br>
        <label for="monthlyTime">Monthly Time (seconds):</label>
        <input type="number" id="monthlyTime" name="monthlyTime" value="${statsData.monthlyTime}" required>
        <br>
        <label for="monthlyElevation">Monthly Elevation (meters):</label>
        <input type="number" id="monthlyElevation" name="monthlyElevation" value="${statsData.monthlyElevation}" required>
        <br>
        <label for="monthlyGoal">Monthly Goal (km):</label>
        <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="${metersToKm(statsData.monthlyGoal)}" required>
        
        <h3>Yearly Stats</h3>
        <label for="yearlyDistance">Yearly Distance (km):</label>
        <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="${metersToKm(statsData.yearlyDistance)}" required>
        <br>
        <label for="yearlyTime">Yearly Time (seconds):</label>
        <input type="number" id="yearlyTime" name="yearlyTime" value="${statsData.yearlyTime}" required>
        <br>
        <label for="yearlyElevation">Yearly Elevation (meters):</label>
        <input type="number" id="yearlyElevation" name="yearlyElevation" value="${statsData.yearlyElevation}" required>
        <br>
        <label for="yearlyGoal">Yearly Goal (km):</label>
        <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="${metersToKm(statsData.yearlyGoal)}" required>
        <br>
        <label for="manuallyUpdated">Update Mode:</label>
        <select id="manuallyUpdated" name="manuallyUpdated">
          <option value="true" ${statsData.manuallyUpdated ? 'selected' : ''}>Manual (preserve my values)</option>
          <option value="false" ${!statsData.manuallyUpdated ? 'selected' : ''}>Auto (update with runs)</option>
        </select>
        <br>
        <button type="submit">Update Stats</button>
      </form>
      <p><a href="/toggle-stats-mode">Toggle Auto/Manual Mode</a></p>
      <a href="/xapp">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

router.post('/manual-stats-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStats(req.body);
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/stats">View Stats</a><br><a href="/xapp">App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">App</a>`);
  }
});

module.exports = router;
