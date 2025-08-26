const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakRoutes = require('./routes/streakRoutes');
const statsRoutes = require('./routes/statsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const manualRoutes = require('./routes/manualRoutes');
const refreshDataMiddleware = require('./middleware/refreshData'); // Add this line

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(refreshDataMiddleware); // Add this line to use the middleware on all routes

// Routes
app.use('/', authRoutes);
app.use('/', streakRoutes);
app.use('/', statsRoutes);
app.use('/', webhookRoutes);
app.use('/', manualRoutes);

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
    <p>Visit <a href="/setup-webhook">/setup-webhook</a> to setup automatic updates</p>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in: ./data/`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
