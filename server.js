const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add JSON parsing for webhooks

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
    const fileData = JSON.parse(data);
    
    // Use file data if it exists and has a lastManualUpdate date
    if (fileData.lastManualUpdate) {
      const fileUpdateDate = new Date(fileData.lastManualUpdate);
      const defaultUpdateDate = new Date(defaults.lastManualUpdate);
      
      // Use file data if it's newer than defaults
      if (fileUpdateDate >= defaultUpdateDate) {
        return fileData;
      }
    }
    
    return { ...defaults, ...fileData };
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
    totalRuns: 250,
    totalDistance: 2346600,
    totalTime: 699900,
    totalElevation: 25714,
    streakStartDate: "2024-12-31",
    lastRunDate: new Date(Date.now() - 86400000).toDateString(),
    manuallyUpdated: true,
    lastManualUpdate: new Date().toDateString()
  };

  try {
    await ensureDataDir();
    const data = await fs.readFile(streakFile, 'utf8');
    const fileData = JSON.parse(data);
    
    // Use file data if it exists and has a lastManualUpdate date
    if (fileData.lastManualUpdate) {
      const fileUpdateDate = new Date(fileData.lastManualUpdate);
      const defaultUpdateDate = new Date(defaults.lastManualUpdate);
      
      // Use file data if it's newer than defaults
      if (fileUpdateDate >= defaultUpdateDate) {
        return fileData;
      }
    }
    
    return { ...defaults, ...fileData };
  } catch (error) {
    await saveData(streakFile, defaults);
    return defaults;
  }
}

async function saveStreakData(data) {
  data.lastManualUpdate = new Date().toDateString();
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

  try {
    await ensureDataDir();
    const data = await fs.readFile(statsFile, 'utf8');
    const fileData = JSON.parse(data);
    
    // Use file data if it exists and has a lastUpdated date
    if (fileData.lastUpdated) {
      const fileUpdateDate = new Date(fileData.lastUpdated);
      const defaultUpdateDate = new Date();
      
      // Use file data if it's newer than defaults (1 day threshold)
      if (fileUpdateDate >= new Date(defaultUpdateDate.getTime() - 86400000)) {
        return fileData;
      }
    }
    
    return { ...defaults, ...fileData };
  } catch (error) {
    await saveData(statsFile, defaults);
    return defaults;
  }
}

async function saveStatsData(data) {
  data.lastUpdated = new Date().toISOString();
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

function generateProgressBars(distance, goal, type = 'monthly', segments = 10) {
  const completed = Math.min(Math.floor((distance / goal) * segments), segments);
  
  // Use blue for monthly, green for yearly
  if (type === 'monthly') {
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
                   !line.includes('📷 @DailyRunGuy') &&
                   !line.includes('🔵') && // Remove progress bars
                   !line.includes('🟢') &&
                   !line.includes('⚪️'))
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
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
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
Monthly: ${stats.monthlyDistance.toFixed(1)}/${stats.monthlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.monthlyDistance, stats.monthlyGoal, 'monthly')}
Yearly: ${stats.yearlyDistance.toFixed(1)}/${stats.yearlyGoal} km  | ⛰️ ${Math.round(streakData.totalElevation)} m
${generateProgressBars(stats.yearlyDistance, stats.yearlyGoal, 'yearly')}
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

    // Only update totals if not manually updated, otherwise use exact manual values
    if (!streakData.manuallyUpdated) {
      streakData.totalRuns += 1;
      streakData.totalDistance += todaysRun.distance;
      streakData.totalTime += todaysRun.moving_time || 0;
      streakData.totalElevation += todaysRun.total_elevation_gain || 0;
    }

    // Set lastRunDate to yesterday to continue the streak properly
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    streakData.lastRunDate = yesterday.toDateString();

    // Keep the manually set streak count, only update if not manually set
    if (!streakData.manuallyUpdated) {
      if (streakData.lastRunDate === yesterday.toDateString()) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1;
        streakData.streakStartDate = todayDate;
      }
    }

    // Update longest streak if needed
    if (streakData.currentStreak > streakData.longestStreak) {
      streakData.longestStreak = streakData.currentStreak;
    }

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

// Process activity from webhook
async function processActivity(activityId) {
  try {
    const activity = await getActivity(activityId);
    
    // Only process runs over 4500 meters
    if (activity.type === 'Run' && activity.distance >= 4500) {
      const result = await updateRunStreak();
      console.log('Processed activity automatically:', activityId, result.message);
      return result;
    } else {
      console.log('Activity does not meet criteria:', activityId, activity.type, `${(activity.distance / 1000).toFixed(1)} km`);
      return { message: "Activity does not meet criteria" };
    }
  } catch (error) {
    console.error('Error processing activity:', error);
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
  
  // Set lastRunDate to yesterday to continue the streak properly
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  streakData.lastRunDate = yesterday.toDateString();
  
  streakData.lastManualUpdate = new Date().toDateString();
  
  await saveStreakData(streakData);
  
  return { 
    success: true, 
    message: "Streak updated manually. Your exact values will be preserved." 
  };
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

// Webhook verification and processing
app.get('/webhook', (req, res) => {
  // Strava webhook verification
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      res.json({ 'hub.challenge': challenge });
    } else {
      res.status(403).send('Verification failed');
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

app.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature'];
    if (signature) {
      const expectedSignature = 'sha1=' + crypto
        .createHmac('sha1', process.env.WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('Webhook signature verification failed');
        return res.status(401).send('Signature verification failed');
      }
    }
    
    // Process the webhook event
    const event = req.body;
    console.log('Webhook received:', event.object_type, event.aspect_type, event.object_id);
    
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
      // Process activity asynchronously
      processActivity(event.object_id).catch(console.error);
    }
    
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

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
    <p>Visit <a href="/setup-webhook">/setup-webhook</a> to setup automatic updates</p>
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

app.get('/setup-webhook', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const callbackUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/webhook`;
    
    // Try to create webhook
    try {
      const response = await axios.post('https://www.strava.com/api/v3/push_subscriptions', {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        callback_url: callbackUrl,
        verify_token: process.env.WEBHOOK_VERIFY_TOKEN
      });
      
      res.send(`<h1>Webhook Setup</h1><p>Webhook created successfully!</p><pre>${JSON.stringify(response.data, null, 2)}</pre><a href="/">Home</a>`);
    } catch (error) {
      // If webhook already exists, try to view existing ones
      const subscriptions = await axios.get('https://www.strava.com/api/v3/push_subscriptions', {
        params: {
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET
        }
      });
      
      res.send(`<h1>Webhook Setup</h1><p>Webhook already exists or error creating:</p><pre>${JSON.stringify(subscriptions.data, null, 2)}</pre><a href="/">Home</a>`);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
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

// Manual update forms (same as before)
// [Include all the manual update forms from previous version]

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data will be stored in: ./data/`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
