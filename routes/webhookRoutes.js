const express = require('express');
const stravaApi = require('../services/stravaApi');
const { processActivity, verifyWebhookSignature } = require('../controllers/webhookController');
const router = express.Router();

router.get('/webhook', (req, res) => {
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

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature'];
    if (signature && !verifyWebhookSignature(signature, req.body, process.env.WEBHOOK_SECRET)) {
      console.error('Webhook signature verification failed');
      return res.status(401).send('Signature verification failed');
    }
    
    const event = req.body;
    console.log('Webhook received:', event.object_type, event.aspect_type, event.object_id);
    
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
      processActivity(event.object_id).catch(console.error);
    }
    
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

router.get('/setup-webhook', async (req, res) => {
  try {
    const callbackUrl = `${process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`}/webhook`;
    
    try {
      const response = await stravaApi.setupWebhook(callbackUrl, process.env.WEBHOOK_VERIFY_TOKEN);
      res.send(`<h1>Webhook Setup</h1><p>Webhook created successfully!</p><pre>${JSON.stringify(response, null, 2)}</pre><a href="/">Home</a>`);
    } catch (error) {
      const subscriptions = await stravaApi.getWebhooks();
      res.send(`<h1>Webhook Setup</h1><p>Webhook already exists or error creating:</p><pre>${JSON.stringify(subscriptions, null, 2)}</pre><a href="/">Home</a>`);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

module.exports = router;
