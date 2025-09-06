const crypto = require('crypto');
const stravaApi = require('../services/stravaApi');

async function processActivity(activityId, controllers, storage) {
  try {
    const { updateStreakStatsWithRun, pushToStravaDescription } = controllers;
    const { saveLastActivity } = storage;
    
    // ALWAYS GET THE VERY LATEST ACTIVITY FROM STRAVA (IGNORE THE WEBHOOK ACTIVITY ID)
    const activities = await stravaApi.getRecentActivities(1);
    const latestActivity = activities[0];
    
    if (!latestActivity) {
      return { message: "No activities found" };
    }

    // Only process runs
    if (latestActivity.type === 'Run') {
      // Update streakstats with the latest run
      await updateStreakStatsWithRun(latestActivity, storage);
      
      // Update description of the LATEST activity
      await pushToStravaDescription(latestActivity.id, storage);
      
      // Optional: Still save it as last activity for display purposes
      await saveLastActivity({
        id: latestActivity.id,
        date: latestActivity.start_date,
        type: latestActivity.type,
        distance: latestActivity.distance
      });
      
      console.log('Processed LATEST run activity:', latestActivity.id, `${(latestActivity.distance / 1000).toFixed(1)} km`);
      return { message: "Latest run activity processed successfully" };
    }
    
    // Save non-run activities for display only
    await saveLastActivity({
      id: latestActivity.id,
      date: latestActivity.start_date,
      type: latestActivity.type,
      distance: latestActivity.distance
    });
    
    return { message: "Latest activity was not a run" };
  } catch (error) {
    console.error('Error processing latest activity:', error.message);
    throw error;
  }
}

function verifyWebhookSignature(signature, body, secret) {
  if (!signature || !secret) return false;
  
  const expectedSignature = 'sha1=' + crypto
    .createHmac('sha1', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return signature === expectedSignature;
}

module.exports = {
  processActivity,
  verifyWebhookSignature
};
