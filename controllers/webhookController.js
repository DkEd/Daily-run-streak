const crypto = require('crypto');
const stravaApi = require('../services/stravaApi');
const { updateStatsWithRun } = require('./statsController');
const { updateRunStreak } = require('./streakController');

async function processActivity(activityId) {
  try {
    const activity = await stravaApi.getActivity(activityId);
    
    await updateStatsWithRun(activity);
    
    if (activity.type === 'Run' && activity.distance >= 4500) {
      const result = await updateRunStreak();
      console.log('Processed qualifying activity:', activityId, result.message);
      return result;
    } else {
      console.log('Activity added to stats but not streak:', activityId, activity.type, `${(activity.distance / 1000).toFixed(1)} km`);
      return { message: "Activity added to stats but not streak (distance <4500m)" };
    }
  } catch (error) {
    console.error('Error processing activity:', error);
    throw error;
  }
}

function verifyWebhookSignature(signature, body, secret) {
  if (!signature) return false;
  
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
