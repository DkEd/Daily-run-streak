const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Data storage
const dataDir = path.join(__dirname, 'data');
const streakFile = path.join(dataDir, 'streakData.json');
const statsFile = path.join(dataDir, 'statsData.json');

// Ensure data directory exists
const ensureDataDir = async () => {
  try { await fs.access(dataDir); } 
  catch { await fs.mkdir(dataDir, { recursive: true }); }
};

// Load data with defaults
const loadData = async (filePath, defaults) => {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, 'utf8');
    return { ...defaults, ...JSON.parse(data) };
  } catch {
    await saveData(filePath, defaults);
    return defaults;
  }
};

// Save data
const saveData = async (filePath, data) => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Load streak data
const loadStreakData = async () => {
  const defaults = {
    currentStreak: 238,
    longestStreak: 238,
    totalRuns: 238,
    totalDistance: 2346600,
    totalTime: 699900,
    totalElevation: 25714,
    streakStartDate: "2024-12-31",
    lastRunDate: new Date(Date.now() - 86400000).toDateString(),
    manuallyUpdated: true
  };
  return loadData(streakFile, defaults);
};

// Save streak data
const saveStreakData = async (data) => {
  await saveData(streakFile, data);
};

// Load stats data
const loadStatsData = async () => {
  const defaults = {
    monthlyDistance: 229.5,
    yearlyDistance: 2336.0,
    monthlyElevation: 2793,
    yearlyElevation: 25595,
    monthlyGoal: 250,
    yearlyGoal: 3250
  };
  return loadData(statsFile, defaults);
};

// Save stats data
const saveStatsData = async (data) => {
  await saveData(statsFile, data);
};

// Strava API functions
let accessToken = process.env.ACCESS_TOKEN;
let refreshToken = process.env.REFRESH_TOKEN;
let expiresAt = process.env.EXPIRES_AT;

const refreshAccessToken = async () => {
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });
    
    const { access_token, refresh_token, expires_at } = response.data;
    accessToken = access_token;
    refreshToken = refresh_token;
    expiresAt = expires_at;
    
    // Update environment variables
    process.env.ACCESS_TOKEN = accessToken;
    process.env.REFRESH_TOKEN = refreshToken;
    process.env.EXPIRES_AT = expiresAt;
    
    console.log('Token refreshed');
  } catch (error) {
    console.error('Token refresh failed:', error.response?.data || error.message);
    throw new Error('Token refresh failed. Re-authenticate at /auth/strava');
  }
};

const getAccessToken = async () => {
  if (!expiresAt || Date.now() / 1000 >= expiresAt) {
    await refreshAccessToken();
  }
  return accessToken;
};

const getRecentActivities = async (days = 7) => {
  const token = await getAccessToken();
  const after = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  
  const response = await axios.get(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=30`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  return response.data;
};

const getActivity = async (activityId) => {
  const token = await getAccessToken();
  const response = await axios.get(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.data;
};

const updateActivityDescription = async (activityId, description) => {
  const token = await getAccessToken();
  await axios.put(
    `https://www.strava.com/api/v3/activities/${activityId}`,
    { description },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
};

// Utility functions
const formatDate = (date) => date.toISOString().split('T')[0];
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const generateProgressBars = (distance, goal, segments = 10) => {
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  return '🟢'.repeat(completed) + '⚪️'.repeat(segments - completed);
};

const cleanExistingDescription = (description) => {
  if (!description) return '';
  return description
    .split('\n')
    .filter(line => line.trim() !== '')
    .filter(line => !line.includes('🏃🏻‍♂️Daily Run Streak:') && 
                   !line.includes('📊') && 
                   !line.includes('Monthly:') &&
                   !line.includes('Yearly:') &&
                   !line.includes('📷 @DailyRunGuy'))
    .join('\n')
    .trim();
};

// Generate description
const generateDescription = async (streakData, activityId) => {
  try {
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

    return existingDescription ? `${streakSection}\n\n${existingDescription}` : streakSection;
  } catch (error) {
    console.error('Error generating description:', error);
    const stats = await loadStatsData();
    return `🏃🏻‍♂️Daily Run Streak: Day ${streakData.currentStreak} 👍🏻
📊 ${(streakData.totalDistance / 1000).toFixed(1)} km | ⏱️ ${formatTime(streakData.totalTime)} | ⛰️ ${Math.round(streakData.totalElevation)} m
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(stats.monthlyElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal)}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(stats.yearlyElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal)}
📷 @DailyRunGuy`;
  }
};

// Update stats with any run
const updateStatsWithRun = async (activity) => {
  if (activity.type === 'Run') {
    const stats = await loadStatsData();
    const now = new Date();
    const activityDate = new Date(activity.start_date);
    
    // Reset monthly stats if new month
    if (stats.lastUpdated) {
      const lastUpdated = new Date(stats.lastUpdated);
      if (lastUpdated.getMonth() !== now.getMonth() || lastUpdated.getFullYear() !== now.getFullYear()) {
        stats.monthlyDistance = 0;
        stats.monthlyElevation = 0;
      }
    }
    
    // Update stats
    stats.monthlyDistance += activity.distance / 1000;
    stats.yearlyDistance += activity.distance / 1000;
    stats.monthlyElevation += activity.total_elevation_gain || 0;
    stats.yearlyElevation += activity.total_elevation_gain || 0;
    stats.lastUpdated = now.toISOString();
    
    await saveStatsData(stats);
  }
};

// Main streak function
const updateRunStreak = async () => {
  try {
    const streakData = await loadStreakData();
    const activities = await getRecentActivities(2);
    const today = formatDate(new Date());
    
    // Process all runs for stats
    const todaysRuns = activities.filter(activity => 
      activity.type === 'Run' && formatDate(new Date(activity.start_date)) === today
    );
    
    for (const run of todaysRuns) {
      await updateStatsWithRun(run);
    }
    
    // Find qualifying run for streak (>4500m)
    const todaysRun = todaysRuns.find(activity => activity.distance >= 4500);
    
    if (!todaysRun) {
      return { message: "No qualifying run today (>4500m)", ...streakData };
    }
    
    const todayDate = new Date().toDateString();
    
    // Check if already processed
    if (streakData.lastRunDate === todayDate) {
      return { message: "Already processed today", ...streakData };
    }
    
    // Update streak if not manually set
    if (!streakData.manuallyUpdated) {
      streakData.totalRuns += 1;
      streakData.totalDistance += todaysRun.distance;
      streakData.totalTime += todaysRun.moving_time || 0;
      streakData.totalElevation += todaysRun.total_elevation_gain || 0;
      
      // Update streak count
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      streakData.lastRunDate = yesterday.toDateString();
      
      if (streakData.lastRunDate === yesterday.toDateString()) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
      
      // Update longest streak
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }
    }
    
    await saveStreakData(streakData);
    
    // Update description
    const description = await generateDescription(streakData, todaysRun.id);
    await updateActivityDescription(todaysRun.id, description);
    
    return { message: "Streak updated", ...streakData, newDescription: description };
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

// Manual update functions
const manuallyUpdateStreak = async (updates) => {
  const streakData = await loadStreakData();
  Object.assign(streakData, updates);
  streakData.manuallyUpdated = true;
  await saveStreakData(streakData);
  return { success: true, message: "Streak updated manually" };
};

const manuallyUpdateStats = async (updates) => {
  const stats = await loadStatsData();
  Object.assign(stats, updates);
  await saveStatsData(stats);
  return { success: true, message: "Stats updated manually" };
};

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p><a href="/update-streak">Update Streak</a> | <a href="/streak-status">View Streak</a></p>
    <p><a href="/stats">View Stats</a> | <a href="/auth/strava">Authenticate</a></p>
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
    accessToken = access_token;
    refreshToken = refresh_token;
    expiresAt = expires_at;
    
    process.env.ACCESS_TOKEN = accessToken;
    process.env.REFRESH_TOKEN = refreshToken;
    process.env.EXPIRES_AT = expiresAt;
    
    res.send(`<h1>Authenticated!</h1><p>Hello ${athlete.firstname}! <a href="/">Continue</a></p>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

app.get('/update-streak', async (req, res) => {
  try {
    if (!accessToken) return res.send('<h1>Not Authenticated</h1><p><a href="/auth/strava">Authenticate first</a></p>');
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

app.get('/stats', async (req, res) => {
  try {
    const data = await loadStatsData();
    res.send(`<h1>Running Stats</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Simple manual update form
app.get('/manual-update', (req, res) => {
  res.send(`
    <h1>Manual Update</h1>
    <form action="/manual-update" method="POST">
      <h3>Streak Data</h3>
      <input type="number" name="currentStreak" placeholder="Current Streak" value="238" required>
      <input type="number" name="totalDistance" placeholder="Total Distance (m)" value="2346600" required>
      <input type="number" name="totalElevation" placeholder="Total Elevation" value="25714" required>
      
      <h3>Stats Data</h3>
      <input type="number" step="0.1" name="monthlyDistance" placeholder="Monthly Distance (km)" value="229.5" required>
      <input type="number" step="0.1" name="yearlyDistance" placeholder="Yearly Distance (km)" value="2336.0" required>
      <input type="number" name="monthlyElevation" placeholder="Monthly Elevation" value="2793" required>
      <input type="number" name="yearlyElevation" placeholder="Yearly Elevation" value="25595" required>
      
      <button type="submit">Update All</button>
    </form>
    <a href="/">Home</a>
  `);
});

app.post('/manual-update', async (req, res) => {
  try {
    const { currentStreak, totalDistance, totalElevation, monthlyDistance, yearlyDistance, monthlyElevation, yearlyElevation } = req.body;
    
    await manuallyUpdateStreak({
      currentStreak: parseInt(currentStreak),
      totalDistance: parseFloat(totalDistance),
      totalElevation: parseFloat(totalElevation)
    });
    
    await manuallyUpdateStats({
      monthlyDistance: parseFloat(monthlyDistance),
      yearlyDistance: parseFloat(yearlyDistance),
      monthlyElevation: parseFloat(monthlyElevation),
      yearlyElevation: parseFloat(yearlyElevation)
    });
    
    res.send(`<h1>Manual Update Complete</h1><p>All values updated successfully!</p><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data stored in: ./data/`);
});
