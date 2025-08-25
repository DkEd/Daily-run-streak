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
  // Get recent activities (last 7 days)
  const activities = await getRecentActivities();
  
  // Filter to only runs over 4500 meters
  const runs = activities.filter(activity => 
    activity.type === 'Run' && activity.distance >= 4500
  );
  
  // Sort by date (newest first)
  runs.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  
  // Get today's and yesterday's dates
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Format dates to match Strava format (YYYY-MM-DD)
  const todayFormatted = formatDate(today);
  const yesterdayFormatted = formatDate(yesterday);
  
  // Check if there was a run today
  const runToday = runs.find(run => run.start_date_local.startsWith(todayFormatted));
  
  if (runToday) {
    // There was a run today - check if it already has a streak marker
    const streakMatch = runToday.description && runToday.description.match(/🔥 Streak: day (\d+) 🏃/);
    
    if (streakMatch) {
      return { 
        message: "Today's run already has a streak marker", 
        streak: parseInt(streakMatch[1]),
        activityId: runToday.id,
        activityName: runToday.name
      };
    }
    
    // Check if there was a run yesterday
    const runYesterday = runs.find(run => run.start_date_local.startsWith(yesterdayFormatted));
    
    let newStreakCount = 1;
    
    if (runYesterday) {
      // There was a run yesterday - check its streak count
      const yesterdayStreakMatch = runYesterday.description && runYesterday.description.match(/🔥 Streak: day (\d+) 🏃/);
      
      if (yesterdayStreakMatch) {
        newStreakCount = parseInt(yesterdayStreakMatch[1]) + 1;
      } else {
        // No streak found yesterday, check previous days to find the current streak
        newStreakCount = await findCurrentStreak(runs, yesterday);
      }
    } else {
      // No run yesterday, check if we need to continue a streak from before yesterday
      newStreakCount = await findCurrentStreak(runs, yesterday);
    }
    
    // Update the activity description
    const streakText = `🔥 Streak: day ${newStreakCount} 🏃\n`;
    const newDescription = runToday.description 
      ? streakText + runToday.description
      : streakText;
    
    // Only update if the description has changed
    if (newDescription !== runToday.description) {
      await updateActivityDescription(runToday.id, newDescription);
      return { 
        message: "Streak updated successfully", 
        streak: newStreakCount,
        activityId: runToday.id,
        activityName: runToday.name,
        newDescription: newDescription
      };
    }
  } else {
    // No run today - check if there was a run yesterday
    const runYesterday = runs.find(run => run.start_date_local.startsWith(yesterdayFormatted));
    
    if (runYesterday) {
      // There was a run yesterday - get its streak count
      const yesterdayStreakMatch = runYesterday.description && runYesterday.description.match(/🔥 Streak: day (\d+) 🏃/);
      
      if (yesterdayStreakMatch) {
        return { 
          message: "No run today, but yesterday's streak was", 
          streak: parseInt(yesterdayStreakMatch[1])
        };
      } else {
        // No streak found yesterday, check previous days
        const currentStreak = await findCurrentStreak(runs, yesterday);
        return { 
          message: "No run today, but current streak is", 
          streak: currentStreak
        };
      }
    } else {
      // No run yesterday either
      return { 
        message: "No runs found for today or yesterday", 
        streak: 0
      };
    }
  }
}

// Helper function to find the current streak by checking previous days
async function findCurrentStreak(runs, fromDate) {
  let currentDate = new Date(fromDate);
  let streakCount = 0;
  let foundStart = false;
  
  // Check up to 30 days back to find the current streak
  for (let i = 0; i < 30; i++) {
    const dateFormatted = formatDate(currentDate);
    const runOnDate = runs.find(run => run.start_date_local.startsWith(dateFormatted));
    
    if (runOnDate) {
      // Found a run on this date
      if (!foundStart) {
        // This is the most recent run in the streak
        const streakMatch = runOnDate.description && runOnDate.description.match(/🔥 Streak: day (\d+) 🏃/);
        
        if (streakMatch) {
          // Found a streak marker, use this as the base
          streakCount = parseInt(streakMatch[1]);
          foundStart = true;
        } else if (i === 0) {
          // No streak marker on the most recent run, start at 1
          streakCount = 1;
          foundStart = true;
        } else {
          // No streak marker, but we're counting backwards
          streakCount++;
        }
      } else {
        // We're counting backwards through the streak
        streakCount++;
      }
    } else if (foundStart) {
      // We found the start of the streak and now we've hit a day with no run
      break;
    }
    
    // Move to the previous day
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streakCount;
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get recent activities from Strava (last 7 days)
async function getRecentActivities() {
  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const after = Math.floor(sevenDaysAgo.getTime() / 1000);
  
  const response = await axios.get(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=50`,
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
