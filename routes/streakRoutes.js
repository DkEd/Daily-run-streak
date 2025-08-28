const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const { updateRunStreak, getCurrentStreak, getAllStreakData, resetStreak } = require('../controllers/streakController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { requireAuth } = require('../middleware/authCheck');
const { metersToKm, formatTime } = require('../utils/formatters');
const router = express.Router();

// Apply middleware to all streak routes
router.use(refreshDataMiddleware);

router.get('/update-streak', requireAuth, async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    const result = await updateRunStreak();
    res.send(`
      <h1>Streak Update</h1>
      <p><strong>Status:</strong> ${result.message}</p>
      <h2>Current Streak Data:</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <p><a href="/streak-details">View Detailed Streak Info</a> | <a href="/">Home</a></p>
    `);
  } catch (error) {
    console.error('Error updating streak:', error.message);
    
    if (error.message.includes('re-authenticate')) {
      res.status(401).send(`
        <h1>Authentication Required</h1>
        <p>${error.message}</p>
        <p>Please <a href="/auth/strava">re-authenticate with Strava</a>.</p>
        <a href="/">Home</a>
      `);
    } else {
      res.status(500).send(`
        <h1>Error</h1>
        <p>${error.message}</p>
        <a href="/">Home</a>
      `);
    }
  }
});

router.get('/streak-status', async (req, res) => {
  try {
    const streak = await getCurrentStreak();
    res.send(`
      <h1>Current Streak: ${streak} days 🔥</h1>
      <p><a href="/streak-details">View Detailed Streak Info</a> | <a href="/">Home</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Home</a>
    `);
  }
});

router.get('/streak-details', async (req, res) => {
  try {
    const data = await getAllStreakData();
    res.send(`
      <h1>Streak Details</h1>
      <h2>Current Status</h2>
      <p><strong>Current Streak:</strong> ${data.currentStreak} days</p>
      <p><strong>Longest Streak:</strong> ${data.longestStreak} days</p>
      <p><strong>Total Runs:</strong> ${data.totalRuns}</p>
      <p><strong>Total Distance:</strong> ${metersToKm(data.totalDistance)} km</p>
      <p><strong>Total Time:</strong> ${formatTime(data.totalTime)}</p>
      <p><strong>Total Elevation:</strong> ${data.totalElevation} m</p>
      <p><strong>Streak Start Date:</strong> ${data.streakStartDate}</p>
      <p><strong>Last Run Date:</strong> ${data.lastRunDate || 'No runs yet'}</p>
      <p><strong>Manually Updated:</strong> ${data.manuallyUpdated ? 'Yes' : 'No'}</p>
      ${data.lastManualUpdate ? `<p><strong>Last Manual Update:</strong> ${data.lastManualUpdate}</p>` : ''}
      
      <h2>Raw Data</h2>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      
      <p>
        <a href="/update-streak">Update Streak</a> | 
        <a href="/manual-streak-update">Manual Update</a> | 
        <a href="/reset-streak">Reset Streak</a> | 
        <a href="/">Home</a>
      </p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Home</a>
    `);
  }
});

router.get('/reset-streak', requireAuth, async (req, res) => {
  try {
    const result = await resetStreak();
    res.send(`
      <h1>Streak Reset</h1>
      <p>${result.message}</p>
      <h2>Reset Streak Data:</h2>
      <pre>${JSON.stringify(result.data, null, 2)}</pre>
      <p><a href="/streak-details">View Streak Details</a> | <a href="/">Home</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Home</a>
    `);
  }
});

module.exports = router;
