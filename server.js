const express = require('express');
const StravaAuth = require('./stravaAuth');
const StreakLogic = require('./streakLogic');
const StatsLogic = require('./statsLogic');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize modules
const stravaAuth = new StravaAuth();
const streakLogic = new StreakLogic();
const statsLogic = new StatsLogic();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p>Visit <a href="/update-streak">/update-streak</a> to update your streak</p>
    <p>Visit <a href="/streak-status">/streak-status</a> to check current streak</p>
    <p>Visit <a href="/streak-details">/streak-details</a> for detailed streak info</p>
    <p>Visit <a href="/stats">/stats</a> to view running statistics</p>
    <p>Visit <a href="/manual-streak-update">/manual-streak-update</a> to manually adjust streak</p>
    <p>Visit <a href="/manual-stats-update">/manual-stats-update</a> to manually adjust stats</p>
    <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
    <p>Visit <a href="/auth/status">/auth/status</a> to check authentication status</p>
  `);
});

// Authentication routes
app.get('/auth/strava', (req, res) => {
  res.redirect(stravaAuth.getAuthUrl());
});

app.get('/auth/callback', async (req, res) => {
  try {
    const tokenData = await stravaAuth.exchangeCodeForToken(req.query.code);
    res.send(`<h1>Authenticated!</h1><p>Hello ${tokenData.athlete.firstname}! <a href="/">Continue</a></p>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/auth/status', (req, res) => {
  res.send(`<h1>Auth Status</h1><p>Authenticated: ${stravaAuth.isAuthenticated() ? 'Yes' : 'No'}</p>`);
});

// Streak routes
app.get('/update-streak', async (req, res) => {
  try {
    if (!stravaAuth.isAuthenticated()) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate first</a></p>');
    }
    
    await stravaAuth.refreshTokenIfNeeded();
    const result = await streakLogic.updateRunStreak();
    res.send(`<h1>Streak Update</h1><pre>${JSON.stringify(result, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/streak-status', async (req, res) => {
  const streak = await streakLogic.getCurrentStreak();
  res.send(`<h1>Current Streak: ${streak} days</h1><a href="/">Home</a>`);
});

app.get('/streak-details', async (req, res) => {
  const data = await streakLogic.getAllStreakData();
  res.send(`<h1>Streak Details</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
});

// Stats routes
app.get('/stats', async (req, res) => {
  const data = await statsLogic.getAllStats();
  res.send(`<h1>Running Stats</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
});

// Manual update forms and handlers (similar to previous implementation)
// [Include the manual update forms from previous server.js]

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in: ./data/`);
});
