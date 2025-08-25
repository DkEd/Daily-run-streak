const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

// Your Strava API credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/callback';

// Home route
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Tracker</h1>
    <p>Track your daily running streak with Strava integration.</p>
    <a href="/auth/strava">Connect with Strava</a>
  `);
});

// Initiate Strava OAuth flow
app.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&approval_prompt=auto&scope=activity:read_all`;
  res.redirect(stravaAuthUrl);
});

// Calculate run streak from activities
async function calculateRunStreak(accessToken) {
  try {
    // Get activities from the last 60 days to ensure we capture the full streak
    const now = new Date();
    const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 60)).getTime() / 1000;
    
    const activitiesResponse = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?after=${sixtyDaysAgo}&per_page=200`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const activities = activitiesResponse.data;
    
    // Filter for runs only
    const runs = activities.filter(activity => activity.type === 'Run');
    
    // Create a set of dates when the user ran (YYYY-MM-DD format)
    const runDates = new Set();
    runs.forEach(run => {
      const runDate = new Date(run.start_date_local);
      const dateString = runDate.toISOString().split('T')[0];
      runDates.add(dateString);
    });
    
    // Calculate streak by checking consecutive days backwards from today
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to beginning of day
    
    // Check if user ran today
    const todayString = today.toISOString().split('T')[0];
    if (runDates.has(todayString)) {
      currentStreak = 1;
    } else {
      // No run today, streak is 0
      return 0;
    }
    
    // Check previous days until we find a day without a run
    for (let i = 1; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      if (runDates.has(dateString)) {
        currentStreak++;
      } else {
        break; // Streak ended
      }
    }
    
    return currentStreak;
  } catch (error) {
    console.error('Error calculating run streak:', error);
    return 0;
  }
}

// Handle Strava callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, athlete } = tokenResponse.data;
    
    // Calculate run streak
    const runStreak = await calculateRunStreak(access_token);
    
    // Display success message with streak
    res.send(`
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f7f9fc;
          color: #333;
        }
        .container {
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
          color: #FC4C02;
          margin-top: 0;
        }
        .streak-display {
          font-size: 24px;
          font-weight: bold;
          color: #FC4C02;
          margin: 20px 0;
          padding: 15px;
          background-color: #FFF0E5;
          border-radius: 8px;
          text-align: center;
        }
        .btn {
          display: inline-block;
          background-color: #FC4C02;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 15px;
        }
        .btn:hover {
          background-color: #e04300;
        }
      </style>
      <div class="container">
        <h1>Successfully Connected to Strava!</h1>
        <p>Hello <strong>${athlete.firstname} ${athlete.lastname}</strong>!</p>
        <div class="streak-display">
          Daily Run Streak: ${runStreak} ${runStreak === 1 ? 'day' : 'days'}
        </div>
        <p>Your run streak is calculated based on consecutive days with running activities.</p>
        <a href="/" class="btn">Go back home</a>
      </div>
    `);
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(500).send(`
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #d32f2f;">Authentication Failed</h2>
        <p>There was an error connecting to Strava. Please try again.</p>
        <a href="/" style="color: #FC4C02;">Return to home page</a>
      </div>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
