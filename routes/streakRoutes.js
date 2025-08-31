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
      <p><strong>Last Run Date:</strong> ${result.lastRunDate || 'Not set'}</p>
      <p><strong>Current Date:</strong> ${new Date().toDateString()}</p>
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
router.get('/update-strava-activity', async (req, res) => {
  try {
    if (!await stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate with Strava first</a></p>');
    }
    
    // Get only the most recent activity
    const activities = await stravaApi.getRecentActivities(1);
    
    if (activities.length === 0) {
      return res.send('<h1>No Activities Found</h1><p>No recent activities found to update.</p><a href="/xapp">Back to App</a>');
    }
    
    const activity = activities[0];
    const streakData = await loadStreakData();
    
    if (activity.type === 'Run') {
      const description = await generateDescription(streakData, activity.id);
      await stravaApi.updateActivityDescription(activity.id, description);
      
      res.send(`
        <h1>Strava Activity Updated</h1>
        <p>Successfully updated the most recent run activity on Strava.</p>
        <p><strong>Activity:</strong> ${new Date(activity.start_date).toLocaleString()} - ${(activity.distance / 1000).toFixed(1)} km</p>
        <p><a href="/xapp">Back to App</a></p>
      `);
    } else {
      res.send(`
        <h1>No Run Activity</h1>
        <p>The most recent activity is not a run (${activity.type}). Only run activities are updated.</p>
        <p><a href="/xapp">Back to App</a></p>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/streak-status', async (req, res) => {
  try {
    const streak = await getCurrentStreak();
    const streakData = await getAllStreakData();
    res.send(`
      <h1>Current Streak: ${streak} days 🔥</h1>
      <p><strong>Last Run Date:</strong> ${streakData.lastRunDate || 'No runs yet'}</p>
      <p><strong>Current Date:</strong> ${new Date().toDateString()}</p>
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
    const currentDate = new Date();
    const lastRunRelative = data.lastRunDate ? Math.floor((currentDate - new Date(data.lastRunDate)) / (1000 * 3600 * 24)) : 'Never';
    
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
      
      <h2>Debug Info</h2>
      <p><strong>Current Date:</strong> ${currentDate.toDateString()}</p>
      <p><strong>Last Run Relative:</strong> ${lastRunRelative} ${lastRunRelative !== 'Never' ? 'days ago' : ''}</p>
      
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
