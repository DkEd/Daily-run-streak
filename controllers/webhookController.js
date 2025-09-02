const crypto = require('crypto');
const stravaApi = require('../services/stravaApi');

async function processActivity(activityId, controllers, storage) {
  try {
    const { updateStreakStatsWithRun, pushToStravaDescription } = controllers;
    const { getLastActivity, saveLastActivity } = storage;
    
    const activity = await stravaApi.getActivity(activityId);
    
    // Only process if it's the most recent activity
    const lastActivity = await getLastActivity();
    const activityDate = new Date(activity.start_date);
    const lastActivityDate = lastActivity.date ? new Date(lastActivity.date) : null;
    
    if (!lastActivityDate || activityDate > lastActivityDate) {
      if (activity.type === 'Run') {
        // Update streakstats
        await updateStreakStatsWithRun(activity, storage);
        
        // Update description
        await pushToStravaDescription(activity.id, storage);
        
        console.log('Processed NEW run activity:', activityId, `${(activity.distance / 1000).toFixed(1)} km`);
        return { message: "Run activity processed successfully" };
      }
      
      // Save non-run activities for date tracking
      await saveLastActivity({
        id: activityId,
        date: activity.start_date,
        type: activity.type,
        distance: activity.distance
      });
    }
    
    return { message: "Activity processed or skipped" };
  } catch (error) {
    console.error('Error processing activity:', error.message);
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
