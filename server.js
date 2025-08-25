const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));

// Data storage functions
const dataDir = path.join(__dirname, 'data');
const streakFile = path.join(dataDir, 'streakData.json');
const statsFile = path.join(dataDir, 'statsData.json');

async function ensureDataDir() {
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadData(filePath, defaults) {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf8');
    return { ...defaults, ...JSON.parse(data) };
  } catch (error) {
    await saveData(filePath, defaults);
    return defaults;
  }
}

async function saveData(filePath, data) {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function loadStreakData() {
  const defaults = {
    currentStreak: 0,
    longestStreak: 0,
    totalRuns: 0,
    totalDistance: 0,
    totalTime: 0,
    totalElevation: 0,
    streakStartDate: null,
    lastRunDate: null
  };
  return await loadData(streakFile, defaults);
}

async function saveStreakData(data) {
  await saveData(streakFile, data);
}

async function loadStatsData() {
  const defaults = {
    monthlyDistance: 0,
    yearlyDistance: 0,
    monthlyTime: 0,
    yearlyTime: 0,
    monthlyElevation: 0,
    yearlyElevation: 0,
    monthlyGoal: 200,
    yearlyGoal: 2000,
    lastUpdated: null
  };
  return await loadData(statsFile, defaults);
}

async function saveStatsData(data) {
  await saveData(statsFile, data);
}

// Strava API functions
async function getAccessToken() {
  if (!process.env.EXPIRES_AT || Date.now() / 1000 >= process.env.EXPIRES_AT) {
    await refreshAccessToken();
  }
  return process.env.ACCESS_TOKEN;
}

async function refreshAccessToken() {
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

async function getRecentActivities(days = 7) {
  const accessToken = await getAccessToken();
  const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const response = await axios.get(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  return response.data;
}

async function updateActivityDescription(activityId, description) {
  const accessToken = await getAccessToken();
  
  await axios.put(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { description },
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
}

// Utility functions
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function generateProgressBars(distance, goal, segments = 10) {
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  return '🟢'.repeat(completed) + '⚪️'.repeat(segments - completed);
}

// Main streak function
async function updateRunStreak() {
  try {
    const activities = await getRecentActivities(2);
    const today = formatDate(new Date());
    
    // Find today's qualifying run
    const todaysRun = activities.find(activity => 
      activity.type === 'Run' && 
      activity.distance >= 4500 &&
      formatDate(new Date(activity.start_date)) === today
    );

    if (!todaysRun) {
      const streakData = await loadStreakData();
      return { message: "No qualifying run today", ...streakData };
    }

    // Load and update streak data
    const streakData = await loadStreakData();
    const todayDate = new Date().toDateString();
    
    // Check if we already processed today
    if (streakData.lastRunDate === todayDate) {
      return { message: "Already processed today's run", ...streakData };
    }

    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (streakData.lastRunDate === yesterday.toDateString()) {
      streakData.currentStreak += 1;
    } else {
      streakData.currentStreak = 1;
      streakData.streakStartDate = todayDate;
    }

    // Update totals
    streakData.totalRuns += 1;
    streakData.totalDistance += todaysRun.distance;
    streakData.totalTime += todaysRun.moving_time || 0;
    streakData.totalElevation += todaysRun.total_elevation_gain || 0;
    streakData.lastRunDate = todayDate;

    // Update longest streak
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    // Save updated data
    await saveStreakData(streakData);

    // Generate description
    const stats = await loadStatsData();
    const description = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻

🔥 Streak: ${streakData.currentStreak} days | 🏃🏻‍♂️${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m

📅 Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km 
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal)}

📊 Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km 
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal)}

📷 @DailyRunGuy`;

    // Update activity description
    await updateActivityDescription(todaysRun.id, description);

    return { 
      message: "Streak updated successfully", 
      ...streakData, 
      newDescription: description 
    };

  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p>Visit <a href="/update-streak">/update-streak</a> to update your streak</p>
    <p>Visit <a href="/streak-status">/streak-status</a> to check current streak</p>
    <p>Visit <a href="/streak-details">/streak-details</a> for detailed streak info</p>
    <p>Visit <a href="/stats">/stats</a> to view running statistics</p>
    <p>Visit <a href="/auth/strava">/auth/strava</a> to authenticate with Strava</p>
  `);
});

app.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&approval_prompt=force&scope=activity:read_all,activity:write`;
  res.redirect(stravaAuthUrl);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: req.query.code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;
    process.env.ACCESS_TOKEN = access_token;
    process.env.REFRESH_TOKEN = refresh_token;
    process.env.EXPIRES_AT = expires_at;
    
    res.send(`<h1>Authenticated!</h1><p>Hello ${athlete.firstname}! <a href="/">Continue</a></p>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/update-streak', async (req, res) => {
  try {
    if (!process.env.ACCESS_TOKEN) {
      return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate first</a></p>');
    }
    
    const result = await updateRunStreak();
    res.send(`<h1>Streak Update</h1><pre>${JSON.stringify(result, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

app.get('/streak-status', async (req, res) => {
  try {
    const streakData = await loadStreakData();
    res.send(`<h1>Current Streak: ${streakData.currentStreak} days</h1><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/streak-details', async (req, res) => {
  try {
    const data = await loadStreakData();
    res.send(`<h1>Streak Details</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/stats', async (req, res) => {
  try {
    const data = await loadStatsData();
    res.send(`<h1>Running Stats</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Manual update forms would go here (similar to previous versions)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in: ./data/`);
});
