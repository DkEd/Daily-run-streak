const crypto = require('crypto');
const stravaApi = require('../services/stravaApi');
const { updateStatsWithRun } = require('./statsController');
const { updateRunStreak } = require('./streakController');
const { loadStreakData } = require('../config/storage');
const { generateDescription } = require('../utils/descriptionGenerator');

async function processActivity(activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    
    await updateStatsWithRun(activity);
    
    // Update description for ALL runs
    if (activity.type === 'Run') {
      const streakData = await loadStreakData();
      const description = await generateDescription(streakData, activityId);
      await stravaApi.updateActivityDescription(activityId, description);
      
      // Update streak for ALL runs (no distance requirement)
      const result = await updateRunStreak();
      console.log('Processed activity:', activityId, activity.type, `${(activity.distance / 1000).toFixed(1)} km`);
      return result;
    }
    
    return { message: "Not a run activity" };
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
