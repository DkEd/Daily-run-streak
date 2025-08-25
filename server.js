// server.js
const express = require('express');
const StravaAuth = require('./stravaAuth');
const StreakLogic = require('./streakLogic');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize modules
const stravaAuth = new StravaAuth();
const streakLogic = new StreakLogic();

// Load tokens on startup
(async () => {
  try {
    await stravaAuth.loadTokens();
    console.log('Tokens loaded on startup');
  } catch (error) {
    console.log('No tokens found on startup, need to authenticate');
  }
})();

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p>This app checks your recent runs and updates streak counts.</p>
    <p>Visit <a href="/update-streak">/update-streak</a> to run the update.</p>
    <p>Visit <a href="/streak-status">/streak-status</a> to check current streak.</p>
    <p>Visit <a href="/auth/strava">/auth/strava</a> to re-authenticate if needed.</p>
    <p>Visit <a href="/auth/status">/auth/status</a> to check authentication status.</p>
  `);
});

// Check authentication status
app.get('/auth/status', async (req, res) => {
  try {
    const isAuthenticated = stravaAuth.isAuthenticated();
    res.send(`
      <h1>Authentication Status</h1>
      <p>Authenticated: ${isAuthenticated ? 'Yes' : 'No'}</p>
      ${isAuthenticated ? '<p><a href="/update-streak">Update Streak</a></p>' : '<p><a href="/auth/strava">Authenticate with Strava</a></p>'}
      <a href="/">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Go back</a>
    `);
  }
});

// Check current streak status
app.get('/streak-status', async (req, res) => {
  try {
    const currentStreak = await streakLogic.getCurrentStreak();
    res.send(`
      <h1>Current Streak Status</h1>
      <p>Current Streak: ${currentStreak} days</p>
      <a href="/update-streak">Update Streak</a>
      <br>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    console.error('Error getting streak status:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Go back</a>
    `);
  }
});

// Initiate Strava OAuth flow
app.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = stravaAuth.getAuthUrl();
  res.redirect(stravaAuthUrl);
});

// Handle Strava callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Exchange authorization code for access token using our auth module
    const tokenData = await stravaAuth.exchangeCodeForToken(code);
    
    res.send(`
      <h1>Successfully Authenticated!</h1>
      <p>Hello ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}!</p>
      <p>Your access token has been updated.</p>
      <a href="/update-streak">Update Streak Now</a>
      <br>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(500).send(`
      <h1>Authentication Failed</h1>
      <p>${error.message}</p>
      <p>Please try <a href="/auth/strava">re-authenticating</a>.</p>
      <a href="/">Go back</a>
    `);
  }
});

// Route to manually trigger the streak update
app.get('/update-streak', async (req, res) => {
  try {
    // Check if we're authenticated first
    if (!stravaAuth.isAuthenticated()) {
      return res.send(`
        <h1>Not Authenticated</h1>
        <p>You need to <a href="/auth/strava">authenticate with Strava</a> first.</p>
        <a href="/">Go back</a>
      `);
    }

    // Use auth module to ensure we have a valid token
    await stravaAuth.refreshTokenIfNeeded();
    const result = await streakLogic.updateRunStreak();
    res.send(`
      <h1>Streak Update Result</h1>
      <pre>${JSON.stringify(result, null, 2)}</pre>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    console.error('Error updating streak:', error);
    
    if (error.message.includes('re-authenticate')) {
      res.status(401).send(`
        <h1>Authentication Required</h1>
        <p>${error.message}</p>
        <p>Please <a href="/auth/strava">re-authenticate with Strava</a>.</p>
        <a href="/">Go back</a>
      `);
    } else {
      res.status(500).send(`
        <h1>Error</h1>
        <p>${error.message}</p>
        <a href="/">Go back</a>
      `);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
