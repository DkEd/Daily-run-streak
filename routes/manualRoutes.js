const express = require('express');
const { manuallyUpdateStreak } = require('../controllers/streakController');
const { manuallyUpdateStats } = require('../controllers/statsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const router = express.Router();

// Apply middleware to manual routes
router.use(refreshDataMiddleware);

router.get('/manual-streak-update', (req, res) => {
  res.send(`
    <h1>Manual Streak Update</h1>
    <form action="/manual-streak-update" method="POST">
      <label for="currentStreak">Current Streak:</label>
      <input type="number" id="currentStreak" name="currentStreak" value="0" required>
      <br>
      <label for="longestStreak">Longest Streak:</label>
      <input type="number" id="longestStreak" name="longestStreak" value="0" required>
      <br>
      <label for="totalRuns">Total Runs:</label>
      <input type="number" id="totalRuns" name="totalRuns" value="0" required>
      <br>
      <label for="totalDistance">Total Distance (km):</label>
      <input type="number" step="0.1" id="totalDistance" name="totalDistance" value="0" required>
      <br>
      <label for="totalTime">Total Time (seconds):</label>
      <input type="number" id="totalTime" name="totalTime" value="0" required>
      <br>
      <label for="totalElevation">Total Elevation (meters):</label>
      <input type="number" id="totalElevation" name="totalElevation" value="0" required>
      <br>
      <label for="streakStartDate">Streak Start Date (YYYY-MM-DD):</label>
      <input type="date" id="streakStartDate" name="streakStartDate" required>
      <br>
      <label for="manuallyUpdated">Manually Updated:</label>
      <select id="manuallyUpdated" name="manuallyUpdated">
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
      <br>
      <button type="submit">Update Streak</button>
    </form>
    <a href="/">Go back</a>
  `);
});

router.post('/manual-streak-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStreak(req.body);
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/streak-details">View Streak</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

router.get('/manual-stats-update', async (req, res) => {
  try {
    // Load current stats to pre-fill the form
    const { getAllStats } = require('../controllers/statsController');
    const currentStats = await getAllStats();
    
    res.send(`
      <h1>Manual Stats Update</h1>
      <form action="/manual-stats-update" method="POST">
        <h3>Monthly Stats</h3>
        <label for="monthlyDistance">Monthly Distance (km):</label>
        <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="${currentStats.monthlyDistance}" required>
        <br>
        <label for="monthlyTime">Monthly Time (seconds):</label>
        <input type="number" id="monthlyTime" name="monthlyTime" value="${currentStats.monthlyTime}" required>
        <br>
        <label for="monthlyElevation">Monthly Elevation (meters):</label>
        <input type="number" id="monthlyElevation" name="monthlyElevation" value="${currentStats.monthlyElevation}" required>
        <br>
        <label for="monthlyGoal">Monthly Goal (km):</label>
        <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="${currentStats.monthlyGoal}" required>
        
        <h3>Yearly Stats</h3>
        <label for="yearlyDistance">Yearly Distance (km):</label>
        <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="${currentStats.yearlyDistance}" required>
        <br>
        <label for="yearlyTime">Yearly Time (seconds):</label>
        <input type="number" id="yearlyTime" name="yearlyTime" value="${currentStats.yearlyTime}" required>
        <br>
        <label for="yearlyElevation">Yearly Elevation (meters):</label>
        <input type="number" id="yearlyElevation" name="yearlyElevation" value="${currentStats.yearlyElevation}" required>
        <br>
        <label for="yearlyGoal">Yearly Goal (km):</label>
        <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="${currentStats.yearlyGoal}" required>
        <br>
        <button type="submit">Update Stats</button>
      </form>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

router.post('/manual-stats-update', async (req, res) => {
  try {
    const result = await manuallyUpdateStats(req.body);
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/stats">View Stats</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

module.exports = router;
