const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Home route - just shows a simple message
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava Run Streak Updater</h1>
    <p>This app checks your recent runs and updates streak counts.</p>
    <p>Visit <a href="/update-streak">/update-streak</a> to run the update.</p>
  `);
});

// Route to manually trigger the streak update
app.get('/update-streak', async (req, res) => {
  try {
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
  
  // Check for existing streak text and extract current streak number
  const mostRecentRun = lastThreeRuns[0];
  const streakMatch = mostRecentRun.description && 
    mostRecentRun.description.match(/Daily Run Streak: (\d+)/);
  
  let newStreakCount = 1;
  if (streakMatch) {
    newStreakCount = parseInt(streakMatch[1]) + 1;
  } else {
    // Look for streak count in previous runs
    for (let i = 1; i < lastThreeRuns.length; i++) {
      const prevStreakMatch = lastThreeRuns[i].description && 
        lastThreeRuns[i].description.match(/Daily Run Streak: (\d+)/);
      
      if (prevStreakMatch) {
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
      activityName: mostRecentRun.name
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
