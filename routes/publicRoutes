const express = require('express');
const router = express.Router();

// Home route (public landing page) - NO NAVIGATION, NO LINKS
router.get('/', async (req, res) => {
  try {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Strava Run Streak Tracker</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
          .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 50px 20px; border-radius: 10px; margin-bottom: 30px; }
          .features { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin: 30px 0; }
          .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; width: 200px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <div class="hero">
          <h1>🏃🏻‍♂️ Strava Run Streak Tracker</h1>
          <p>Track your daily running streak and automatically update your Strava activities with progress stats</p>
        </div>
        
        <h2>Features</h2>
        <div class="features">
          <div class="feature">
            <h3>📊 Daily Streak</h3>
            <p>Track your consecutive days of running</p>
          </div>
          <div class="feature">
            <h3>📈 Progress Stats</h3>
            <p>Monthly and yearly running statistics</p>
          </div>
          <div class="feature">
            <h3>🔄 Auto Updates</h3>
            <p>Automatic activity description updates</p>
          </div>
          <div class="feature">
            <h3>☁️ Cloud Sync</h3>
            <p>Data saved to Redis cloud storage</p>
          </div>
        </div>
        
        <h2>How It Works</h2>
        <p>This app connects to your Strava account to track running activities and maintain your daily running streak counter.</p>
        
        <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee;">
          <p>Powered by Strava API • Data stored securely in Upstash Redis</p>
        </footer>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <h1>Strava Run Streak Tracker</h1>
      <p>Welcome to the Strava Run Streak Tracker</p>
    `);
  }
});

// Privacy policy placeholder
router.get('/privacy', (req, res) => {
  res.send(`
    <h1>Privacy Policy</h1>
    <p>This app only stores your Strava activity data needed to maintain your running streak statistics.</p>
    <p>We never share your data with third parties and only use it to provide the service.</p>
    <p><a href="/">Back to Home</a></p>
  `);
});

// Terms of service placeholder
router.get('/terms', (req, res) => {
  res.send(`
    <h1>Terms of Service</h1>
    <p>By using this app, you agree to comply with Strava's API terms of service.</p>
    <p>This is a personal project for tracking running streaks and not an official Strava product.</p>
    <p><a href="/">Back to Home</a></p>
  `);
});

module.exports = router;
