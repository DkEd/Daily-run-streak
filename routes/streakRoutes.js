const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const stravaApi = require('../services/stravaApi');
const { updateRunStreak, getCurrentStreak, getAllStreakData, resetStreak } = require('../controllers/streakController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm, formatTime } = require('../utils/formatters');
const { generateDescription } = require('../utils/descriptionGenerator');
const { loadStreakData } = require('../config/storage');
const router = express.Router();

// Apply middleware to all streak routes
router.use(refreshDataMiddleware);

router.get('/update-streak', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    // Get the most recent activity and pass it to updateRunStreak
    const activities = await stravaApi.getRecentActivities(1);
    const result = await updateRunStreak(activities[0] || null);
    
    res.send(`
      <h1>Streak Update</h1>
      <p><strong>Status:</strong> ${result.message}</p>
      <h2>Current Streak Data:</h2>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <p><a href="/streak-details">View Detailed Streak Info</a> | <a href="/xapp">Back to App</a></p>
    `);
  } catch (error) {
    console.error('Error updating streak:', error.message);
    
    if (error.message.includes('re-authenticate')) {
      res.status(401).send(`
        <h1>Authentication Required</h1>
        <p>${error.message}</p>
        <p>Please <a href="/auth/strava">re-authenticate with Strava</a>.</p>
        <a href="/xapp">Back to App</a>
      `);
    } else {
      res.status(500).send(`
        <h1>Error</h1>
        <p>${error.message}</p>
        <a href="/xapp">Back to App</a>
      `);
    }
  }
});

// Add this new route to force update Strava activities
router.get('/update-strava-activities', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    // Get recent run activities
    const activities = await stravaApi.getRecentActivities(10);
    const runActivities = activities.filter(activity => activity.type === 'Run');
    
    let updatedCount = 0;
    const streakData = await loadStreakData();
    
    // Update each run activity
    for (const activity of runActivities) {
      try {
        const description = await generateDescription(streakData, activity.id);
        await stravaApi.updateActivityDescription(activity.id, description);
        updatedCount++;
        console.log('Updated Strava activity:', activity.id);
      } catch (error) {
        console.error('Error updating activity', activity.id, error.message);
      }
    }
    
    res.send(`
      <h1>Strava Activities Updated</h1>
      <p>Successfully updated ${updatedCount} run activities on Strava.</p>
      <p><a href="/xapp">Back to App</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/streak-status', async (req, res) => {
  try {
    const streak = await getCurrentStreak();
    res.send(`
      <h1>Current Streak: ${streak} days 🔥</h1>
      <p><a href="/streak-details">View Detailed Streak Info</a> | <a href="/xapp">Back to App</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/xapp">Back to App</a>
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
        <a href="/xapp">Back to App</a>
      </p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/xapp">Back to App</a>
    `);
  }
});

router.get('/reset-streak', async (req, res) => {
  try {
    const result = await resetStreak();
    res.send(`
      <h1>Streak Reset</h1>
      <p>${result.message}</p>
      <h2>Reset Streak Data:</h2>
      <pre>${JSON.stringify(result.data, null, 2)}</pre>
      <p><a href="/streak-details">View Streak Details</a> | <a href="/xapp">Back to App</a></p>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/xapp">Back to App</a>
    `);
  }
});

module.exports = router;
