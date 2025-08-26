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
      <input type="number" id="currentStreak" name="currentStreak" value="238" required>
      <br>
      <label for="longestStreak">Longest Streak:</label>
      <input type="number" id="longestStreak" name="longestStreak" value="238" required>
      <br>
      <label for="totalRuns">Total Runs:</label>
      <input type="number" id="totalRuns" name="totalRuns" value="238" required>
      <br>
      <label for="totalDistance">Total Distance (meters):</label>
      <input type="number" id="totalDistance" name="totalDistance" value="2346600" required>
      <br>
      <label for="totalTime">Total Time (seconds):</label>
      <input type="number" id="totalTime" name="totalTime" value="699900" required>
      <br>
      <label for="totalElevation">Total Elevation (meters):</label>
      <input type="number" id="totalElevation" name="totalElevation" value="25714" required>
      <br>
      <label for="streakStartDate">Streak Start Date (YYYY-MM-DD):</label>
      <input type="date" id="streakStartDate" name="streakStartDate" value="2024-12-31" required>
      <br>
      <button type="submit">Update Streak</button>
    </form>
    <a href="/">Go back</a>
  `);
});

router.post('/manual-streak-update', async (req, res) => {
  try {
    const { currentStreak, longestStreak, totalRuns, totalDistance, totalTime, totalElevation, streakStartDate } = req.body;
    const result = await manuallyUpdateStreak(
      currentStreak, longestStreak, totalRuns, totalDistance, totalTime, totalElevation, streakStartDate
    );
    
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><a href="/streak-details">View Streak</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

router.get('/manual-stats-update', (req, res) => {
  res.send(`
    <h1>Manual Stats Update</h1>
    <form action="/manual-stats-update" method="POST">
      <h3>Monthly Stats</h3>
      <label for="monthlyDistance">Monthly Distance (km):</label>
      <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="229.5" required>
      <br>
      <label for="monthlyTime">Monthly Time (seconds):</label>
      <input type="number" id="monthlyTime" name="monthlyTime" value="0" required>
      <br>
      <label for="monthlyElevation">Monthly Elevation (meters):</label>
      <input type="number" id="monthlyElevation" name="monthlyElevation" value="2793" required>
      <br>
      <label for="monthlyGoal">Monthly Goal (km):</label>
      <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="250" required>
      
      <h3>Yearly Stats</h3>
      <label for="yearlyDistance">Yearly Distance (km):</label>
      <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="2336.0" required>
      <br>
      <label for="yearlyTime">Yearly Time (seconds):</label>
      <input type="number" id="yearlyTime" name="yearlyTime" value="0" required>
      <br>
      <label for="yearlyElevation">Yearly Elevation (meters):</label>
      <input type="number" id="yearlyElevation" name="yearlyElevation" value="25595" required>
      <br>
      <label for="yearlyGoal">Yearly Goal (km):</label>
      <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="3250" required>
      <br>
      <button type="submit">Update Stats</button>
    </form>
    <a href="/">Go back</a>
  `);
});

router.post('/manual-stats-update', async (req, res) => {
  try {
    const { monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal } = req.body;
    const result = await manuallyUpdateStats(
      monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal
    );
    
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><a href="/stats">View Stats</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

module.exports = router;
