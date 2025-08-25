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
    currentStreak: 238,
    longestStreak: 238,
    totalRuns: 238,
    totalDistance: 2346600,
    totalTime: 699900,
    totalElevation: 25714,
    streakStartDate: "2024-12-31",
    lastRunDate: new Date().toDateString(),
    manuallyUpdated: true,
    lastManualUpdate: null
  };
  return await loadData(streakFile, defaults);
}

async function saveStreakData(data) {
  await saveData(streakFile, data);
}

async function loadStatsData() {
  const defaults = {
    monthlyDistance: 229.5,
    yearlyDistance: 2336.0,
    monthlyTime: 27519,
    yearlyTime: 649710,
    monthlyElevation: 2793,
    yearlyElevation: 25595,
    monthlyGoal: 250,
    yearlyGoal: 3250,
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

async function getActivity(activityId) {
  const accessToken = await getAccessToken();
  
  const response = await axios.get(
    `https://www.strava.com/api/v3/activities/${activityId}`,
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
  
  if (distance >= goal) {
    return '🔵'.repeat(segments);
  } else if (distance >= goal * 0.7) {
    return '🔵'.repeat(completed) + '⚪️'.repeat(segments - completed);
  } else {
    return '🟢'.repeat(completed) + '⚪️'.repeat(segments - completed);
  }
}

// Clean up existing description (remove empty lines, etc.)
function cleanExistingDescription(description) {
  if (!description) return '';
  
  return description
    .split('\n')
    .filter(line => line.trim() !== '') // Remove empty lines
    .filter(line => !line.includes('🏃🏻‍♂️Daily Run Streak:') && 
                   !line.includes('📊') && 
                   !line.includes('Monthly:') &&
                   !line.includes('Yearly:') &&
                   !line.includes('📷 @DailyRunGuy')) // Remove existing streak info
    .join('\n')
    .trim();
}

// Generate the new description with existing content at the end
async function generateDescription(streakData, activityId) {
  try {
    // Get the existing activity to preserve its description
    const activity = await getActivity(activityId);
    const existingDescription = cleanExistingDescription(activity.description);
    
    const stats = await loadStatsData();
    
    const streakSection = `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal)}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal)}
📷 @DailyRunGuy`;

    // Combine streak info with existing description (if any)
    if (existingDescription) {
      return `${streakSection}\n\n${existingDescription}`;
    }
    
    return streakSection;
  } catch (error) {
    console.error('Error generating description:', error);
    // Fallback if we can't get the activity
    const stats = await loadStatsData();
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal)}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal)}
📷 @DailyRunGuy`;
  }
}

// Main streak function
async function updateRunStreak() {
  try {
    const streakData = await loadStreakData();
    const todayDate = new Date().toDateString();
    
    const activities = await getRecentActivities(2);
    const today = formatDate(new Date());
    
    // Find today's qualifying run
    const todaysRun = activities.find(activity => 
      activity.type === 'Run' && 
      activity.distance >= 4500 &&
      formatDate(new Date(activity.start_date)) === today
    );

    if (!todaysRun) {
      return { message: "No qualifying run today", ...streakData };
    }
    
    // Check if we already processed today
    if (streakData.lastRunDate === todayDate) {
      return { message: "Already processed today's run", ...streakData };
    }

// Keep the manually set streak count, only update if not manually set
if (!streakData.manuallyUpdated) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (streakData.lastRunDate === yesterday.toDateString()) {
    streakData.currentStreak += 1;
  } else {
    streakData.currentStreak = 1;
    streakData.streakStartDate = todayDate;
  }
}

    // Update totals (always add today's run stats)
    streakData.totalRuns += 1;
    streakData.totalDistance += todaysRun.distance;
    streakData.totalTime += todaysRun.moving_time || 0;
    streakData.totalElevation += todaysRun.total_elevation_gain || 0;
    streakData.lastRunDate = todayDate;

    // Update longest streak
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

    // Reset manual update flag
    streakData.manuallyUpdated = false;

    // Save updated data
    await saveStreakData(streakData);

    // Generate description (preserves existing content)
    const description = await generateDescription(streakData, todaysRun.id);

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

// Manual update functions
async function manuallyUpdateStreak(newStreakCount, newLongestStreak, newTotalRuns, newTotalDistance, newTotalTime, newTotalElevation, newStreakStartDate) {
  const streakData = await loadStreakData();
  
  streakData.currentStreak = parseInt(newStreakCount);
  streakData.longestStreak = parseInt(newLongestStreak);
  streakData.totalRuns = parseInt(newTotalRuns);
  streakData.totalDistance = parseFloat(newTotalDistance);
  streakData.totalTime = parseFloat(newTotalTime);
  streakData.totalElevation = parseFloat(newTotalElevation);
  streakData.streakStartDate = newStreakStartDate;
  streakData.manuallyUpdated = true;
  streakData.lastManualUpdate = new Date().toDateString();
  
  await saveStreakData(streakData);
  
  return { success: true, message: "Streak updated manually" };
}

async function manuallyUpdateStats(monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal) {
  const stats = await loadStatsData();
  
  stats.monthlyDistance = parseFloat(monthlyDistance);
  stats.yearlyDistance = parseFloat(yearlyDistance);
  stats.monthlyTime = parseFloat(monthlyTime);
  stats.yearlyTime = parseFloat(yearlyTime);
  stats.monthlyElevation = parseFloat(monthlyElevation);
  stats.yearlyElevation = parseFloat(yearlyElevation);
  stats.monthlyGoal = parseFloat(monthlyGoal);
  stats.yearlyGoal = parseFloat(yearlyGoal);
  
  await saveStatsData(stats);
  
  return { success: true, message: "Stats updated manually" };
}

// Routes
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

// Manual update forms
app.get('/manual-streak-update', (req, res) => {
  res.send(`
    <h1>Manual Streak Update</h1>
    <form action="/manual-streak-update" method="POST">
      <label for="currentStreak">Current Streak:</label>
      <input type="number" id="currentStreak" name="currentStreak" value="238" required>
      <br>
      <label for="longestStreak">Longest Streak:</label>
      <input type="number" id="longestStreak" name="longestStreak" value="238" required>
      <br>
      <label for="totalRuns">Total Runs:</label>
      <input type="number" id="totalRuns" name="totalRuns" value="238" required>
      <br>
      <label for="totalDistance">Total Distance (meters):</label>
      <input type="number" id="totalDistance" name="totalDistance" value="2346600" required>
      <br>
      <label for="totalTime">Total Time (seconds):</label>
      <input type="number" id="totalTime" name="totalTime" value="699900" required>
      <br>
      <label for="totalElevation">Total Elevation (meters):</label>
      <input type="number" id="totalElevation" name="totalElevation" value="25714" required>
      <br>
      <label for="streakStartDate">Streak Start Date (YYYY-MM-DD):</label>
      <input type="date" id="streakStartDate" name="streakStartDate" value="2024-01-01" required>
      <br>
      <button type="submit">Update Streak</button>
    </form>
    <a href="/">Go back</a>
  `);
});

app.post('/manual-streak-update', async (req, res) => {
  try {
    const { currentStreak, longestStreak, totalRuns, totalDistance, totalTime, totalElevation, streakStartDate } = req.body;
    const result = await manuallyUpdateStreak(
      currentStreak, longestStreak, totalRuns, totalDistance, totalTime, totalElevation, streakStartDate
    );
    
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><a href="/streak-details">View Streak</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

app.get('/manual-stats-update', (req, res) => {
  res.send(`
    <h1>Manual Stats Update</h1>
    <form action="/manual-stats-update" method="POST">
      <h3>Monthly Stats</h3>
      <label for="monthlyDistance">Monthly Distance (km):</label>
      <input type="number" step="0.1" id="monthlyDistance" name="monthlyDistance" value="229.5" required>
      <br>
      <label for="monthlyTime">Monthly Time (seconds):</label>
      <input type="number" id="monthlyTime" name="monthlyTime" value="0" required>
      <br>
      <label for="monthlyElevation">Monthly Elevation (meters):</label>
      <input type="number" id="monthlyElevation" name="monthlyElevation" value="2793" required>
      <br>
      <label for="monthlyGoal">Monthly Goal (km):</label>
      <input type="number" step="0.1" id="monthlyGoal" name="monthlyGoal" value="250" required>
      
      <h3>Yearly Stats</h3>
      <label for="yearlyDistance">Yearly Distance (km):</label>
      <input type="number" step="0.1" id="yearlyDistance" name="yearlyDistance" value="2336.0" required>
      <br>
      <label for="yearlyTime">Yearly Time (seconds):</label>
      <input type="number" id="yearlyTime" name="yearlyTime" value="0" required>
      <br>
      <label for="yearlyElevation">Yearly Elevation (meters):</label>
      <input type="number" id="yearlyElevation" name="yearlyElevation" value="25595" required>
      <br>
      <label for="yearlyGoal">Yearly Goal (km):</label>
      <input type="number" step="0.1" id="yearlyGoal" name="yearlyGoal" value="3250" required>
      <br>
      <button type="submit">Update Stats</button>
    </form>
    <a href="/">Go back</a>
  `);
});

app.post('/manual-stats-update', async (req, res) => {
  try {
    const { monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal } = req.body;
    const result = await manuallyUpdateStats(
      monthlyDistance, yearlyDistance, monthlyTime, yearlyTime, monthlyElevation, yearlyElevation, monthlyGoal, yearlyGoal
    );
    
    res.send(`<h1>Manual Update Result</h1><p>${result.message}</p><a href="/stats">View Stats</a><br><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in: ./data/`);
});
