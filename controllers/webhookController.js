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
    
    // Check if activity is from yesterday or older (ignore old activities)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const activityDay = new Date(activityDate);
    activityDay.setHours(0, 0, 0, 0);
    
    if (activityDay < yesterday) {
      console.log('Ignoring old activity from:', activityDate.toISOString());
      return { message: "Old activity ignored" };
    }
    
    if (!lastActivityDate || activityDate > lastActivityDate) {
      if (activity.type === 'Run') {
        // Update streakstats
        await updateStreakStatsWithRun(activity, storage);
        
        // Update description ONLY if this is the most recent activity
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
    } else if (activityDate.getTime() === lastActivityDate.getTime() && activity.id === lastActivity.id) {
      // Same activity as last processed - only update description if specifically requested
      console.log('Re-processing same activity, updating description only:', activityId);
      await pushToStravaDescription(activity.id, storage);
      return { message: "Activity description updated" };
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
