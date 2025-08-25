// server.js
const express = require('express');
const StravaAuth = require('./stravaAuth');
const StreakLogic = require('./streakLogic');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize modules
const stravaAuth = new StravaAuth();
const streakLogic = new StreakLogic();

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p>This app checks your recent runs and updates streak counts.</p>
    <p>Visit <a href="/update-streak">/update-streak</a> to run the update.</p>
    <p>Visit <a href="/auth/strava">/auth/strava</a> to re-authenticate if needed.</p>
  `);
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
    `);
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(500).send('Authentication failed. Check your server logs for details.');
  }
});

// Route to manually trigger the streak update
app.get('/update-streak', async (req, res) => {
  try {
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
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <p>You may need to <a href="/auth/strava">re-authenticate</a>.</p>
      <a href="/">Go back</a>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
