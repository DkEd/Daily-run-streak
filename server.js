const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

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
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&approval_prompt=auto&scope=activity:read_all,activity:write`;
  res.redirect(stravaAuthUrl);
});

// Handle Strava callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;
    
    // Store tokens in environment variables (in a real app, you'd use a database)
    process.env.ACCESS_TOKEN = access_token;
    process.env.REFRESH_TOKEN = refresh_token;
    process.env.EXPIRES_AT = expires_at;
    
    res.send(`
      <h1>Successfully Authenticated!</h1>
      <p>Hello ${athlete.firstname} ${athlete.lastname}!</p>
      <p>Your access token has been updated.</p>
      <a href="/update-streak">Update Streak Now</a>
    `);
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed. Check your server logs for details.');
  }
});

// Refresh access token if expired
async function refreshAccessTokenIfNeeded() {
  if (!process.env.EXPIRES_AT || Date.now() / 1000 >= process.env.EXPIRES_AT) {
    console.log('Refreshing access token...');
    
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: process.env.REFRESH_TOKEN,
        grant_type: 'refresh_token'
      });
      
      const { access_token, refresh_token, expires_at } = response.data;
      process.env.ACCESS_TOKEN = access_token;
      process.env.REFRESH_TOKEN = refresh_token;
      process.env.EXPIRES_AT = expires_at;
      
      console.log('Access token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Token refresh failed. Please re-authenticate at /auth/strava');
    }
  }
}

// Route to manually trigger the streak update
app.get('/update-streak', async (req, res) => {
  try {
    await refreshAccessTokenIfNeeded();
    const result = await updateRunStreak();
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

// Function to update the run streak
async function updateRunStreak() {
  // Get recent activities
  const activities = await getRecentActivities();
  
  // Filter to only runs over 4500 meters
  const runs = activities.filter(activity => 
    activity.type === 'Run' && activity.distance >= 4500
  );
  
  // Sort by date (newest first)
  runs.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  
  // Get the last 3 runs
  const lastThreeRuns = runs.slice(0, 3);
  
  if (lastThreeRuns.length < 3) {
    return { message: "Not enough runs found for streak calculation" };
  }
  
  // Check if runs are on consecutive days
  const dates = lastThreeRuns.map(run => new Date(run.start_date).toDateString());
  const consecutive = areDatesConsecutive(dates);
  
  if (!consecutive) {
    return { message: "Runs are not on consecutive days", dates };
  }
  
  // Check for existing streak text in the most recent run
  const mostRecentRun = lastThreeRuns[0];
  const streakMatch = mostRecentRun.description && 
    mostRecentRun.description.match(/Daily Run Streak: (\d+)/);
  
  let newStreakCount = 1;
  if (streakMatch) {
    // If we found a streak count, increment it
    newStreakCount = parseInt(streakMatch[1]) + 1;
  } else {
    // If no streak found, check previous runs to establish the streak
    for (let i = 1; i < lastThreeRuns.length; i++) {
      const prevStreakMatch = lastThreeRuns[i].description && 
        lastThreeRuns[i].description.match(/Daily Run Streak: (\d+)/);
      
      if (prevStreakMatch) {
        // Found a streak in a previous run, calculate current streak
        newStreakCount = parseInt(prevStreakMatch[1]) + i + 1;
        break;
      }
    }
  }
  
  // Update the activity description
  const newDescription = mostRecentRun.description 
    ? mostRecentRun.description.replace(/Daily Run Streak: \d+/, `Daily Run Streak: ${newStreakCount}`)
    : `Daily Run Streak: ${newStreakCount}`;
  
  // Only update if the description has changed
  if (newDescription !== mostRecentRun.description) {
    await updateActivityDescription(mostRecentRun.id, newDescription);
    return { 
      message: "Streak updated successfully", 
      streak: newStreakCount,
      activityId: mostRecentRun.id,
      activityName: mostRecentRun.name,
      newDescription: newDescription
    };
  } else {
    return { 
      message: "No update needed - streak already correct", 
      streak: newStreakCount 
    };
  }
}

// Helper function to check if dates are consecutive
function areDatesConsecutive(dateStrings) {
  const dates = dateStrings.map(d => new Date(d));
  
  for (let i = 0; i < dates.length - 1; i++) {
    const diffTime = Math.abs(dates[i] - dates[i + 1]);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays !== 1) {
      return false;
    }
  }
  
  return true;
}

// Get recent activities from Strava
async function getRecentActivities() {
  const response = await axios.get(
    'https://www.strava.com/api/v3/athlete/activities?per_page=30',
    {
      headers: {
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
      }
    }
  );
  
  return response.data;
}

// Update an activity's description
async function updateActivityDescription(activityId, description) {
  await axios.put(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    {
      description: description
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`
      }
    }
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
