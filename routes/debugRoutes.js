const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const { loadStreakStats, getStravaTokens, getLastActivity, getWebhookConfig, healthCheck } = require('../config/storage');
const redisClient = require('../config/redis');
const { formatTime } = require('../utils/formatters');
const router = express.Router();

// Debug homepage
router.get('/debug', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    const isAuthenticated = await stravaAuth.isAuthenticated();
    const tokenInfo = await stravaAuth.getTokenInfo();
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Debug Dashboard</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 1000px; margin: 0 auto; }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .status { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
          .status.success { background: #ecfdf5; border: 1px solid #10b981; }
          .status.error { background: #fef2f2; border: 1px solid #ef4444; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.5rem; }
          .btn:hover { background: #2563eb; }
          .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #374151; }
          .btn-outline:hover { background: #f9fafb; }
          ul { list-style: none; padding: 0; }
          li { margin: 0.5rem 0; }
          a { color: #3b82f6; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Debug Dashboard</h1>
          
          <div class="card">
            <h2>System Status</h2>
            <div class="status ${redisHealth ? 'success' : 'error'}">
              <strong>Redis Connection:</strong> ${redisHealth ? '✅ Connected' : '❌ Disconnected'}
            </div>
            <div class="status ${isAuthenticated ? 'success' : 'error'}">
              <strong>Strava Authentication:</strong> ${isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
            </div>
          </div>

          <div class="card">
            <h2>Debug Tools</h2>
            <ul>
              <li><a href="/debug/redis-data">📊 View Redis Data</a> - See all data stored in Redis</li>
              <li><a href="/debug/redis">🔗 Redis Connection Test</a> - Test Redis connection and operations</li>
              <li><a href="/debug/tokens">🔑 Token Storage Debug</a> - Check authentication tokens</li>
              <li><a href="/debug/auth">🔐 Authentication Status</a> - View auth configuration</li>
              <li><a href="/debug/storage">💾 Storage Contents</a> - View all stored data</li>
              <li><a href="/debug/env">⚙️ Environment Variables</a> - Check configuration</li>
              <li><a href="/debug/strava-api">🔄 Strava API Test</a> - Test Strava API connection</li>
              <li><a href="/debug/totaltime">⏱️ TotalTime Debug</a> - Check totalTime value</li>
            </ul>
          </div>

          <div class="card">
            <h2>Authentication Info</h2>
            <pre>${JSON.stringify(tokenInfo, null, 2)}</pre>
          </div>

          <div style="text-align: center; margin-top: 2rem;">
            <a href="/" class="btn">🏠 Home</a>
            <a href="/xapp" class="btn">⚙️ Admin Panel</a>
            <a href="/health" class="btn-outline">❤️ Health Check</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

// Debug endpoint to check current totalTime value
router.get('/debug/totaltime', async (req, res) => {
  try {
    const streakStats = await loadStreakStats();
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TotalTime Debug</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
          pre { background: #f9fafb; padding: 1rem; border-radius: 6px; overflow-x: auto; }
          .btn { display: inline-block; padding: 0.5rem 1rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.25rem; }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>TotalTime Debug</h1>
          
          <div class="card">
            <p><strong>Current totalTime:</strong> ${streakStats.totalTime} seconds</p>
            <p><strong>Formatted:</strong> ${formatTime(streakStats.totalTime)}</p>
            <p><strong>Last Updated:</strong> ${streakStats.lastUpdated}</p>
          </div>
          
          <div class="card">
            <h3>Full StreakStats Data</h3>
            <pre>${JSON.stringify(streakStats, null, 2)}</pre>
          </div>
          
          <div>
            <a href="/manual-streakstats-update" class="btn">✏️ Edit StreakStats</a>
            <a href="/xapp" class="btn">⚙️ Back to Admin</a>
            <a href="/debug" class="btn">🐛 Back to Debug</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Temporary fix endpoint for totalTime
router.post('/debug/fix-totaltime', async (req, res) => {
  try {
    const { loadStreakStats, saveStreakStats } = require('../config/storage');
    const streakStats = await loadStreakStats();
    
    // Force add totalTime if missing
    if (typeof streakStats.totalTime !== 'number') {
      streakStats.totalTime = 0;
      await saveStreakStats(streakStats);
      res.send('<h1>Fixed</h1><p>totalTime field added successfully!</p>');
    } else {
      res.send('<h1>Already Fixed</h1><p>totalTime field already exists.</p>');
    }
    
    res.send(`<pre>${JSON.stringify(streakStats, null, 2)}</pre>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

// Redis data debug endpoint
router.get('/debug/redis-data', async (req, res) => {
  try {
    const streakStats = await loadStreakStats();
    const tokens = await getStravaTokens();
    const lastActivity = await getLastActivity();
    const webhookConfig = await getWebhookConfig();
    const redisHealth = await healthCheck();
    
    // Get all Redis keys for additional info
    let redisKeys = [];
    try {
      redisKeys = await redisClient.keys('*');
    } catch (error) {
      console.error('Error fetching Redis keys:', error.message);
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redis Data Debug</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background: #f8fafc; color: #1f2937; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { color: #1f2937; margin-bottom: 1rem; }
          h2 { color: #374151; margin: 1.5rem 0 1rem 0; }
          .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .status { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
          .status.success { background: #ecfdf5; border: 1px solid #10b981; }
          .status.error { background: #fef2f2; border: 1px solid #ef4444; }
          pre { background: #f9fafb; padding: 1rem; border-radius: 6px; overflow-x: auto; }
          .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #3b82f6; color: white; 
                text-decoration: none; border-radius: 6px; margin: 0.5rem; }
          .btn:hover { background: #2563eb; }
          .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #374151; }
          .btn-outline:hover { background: #f9fafb; }
          .section { margin-bottom: 2rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Redis Data Debug</h1>
          
          <div class="status ${redisHealth ? 'success' : 'error'}">
            <strong>Redis Connection:</strong> ${redisHealth ? '✅ Connected' : '❌ Disconnected'}
          </div>

          <div class="card">
            <h2>Redis Keys</h2>
            <p><strong>Total Keys:</strong> ${redisKeys.length}</p>
            <pre>${JSON.stringify(redisKeys, null, 2)}</pre>
          </div>

          <div class="card">
            <h2>StreakStats Data</h2>
            <p><strong>Key:</strong> app:streakstats</p>
            <p><strong>Last Updated:</strong> ${new Date(streakStats.lastUpdated).toLocaleString()}</p>
            <p><strong>Manually Updated:</strong> ${streakStats.manuallyUpdated ? 'Yes' : 'No'}</p>
            <p><strong>Total Time:</strong> ${streakStats.totalTime} seconds (${formatTime(streakStats.totalTime)})</p>
            <pre>${JSON.stringify(streakStats, null, 2)}</pre>
          </div>

          <div class="card">
            <h2>Token Data</h2>
            <p><strong>Key:</strong> app:tokens</p>
            <p><strong>Has Access Token:</strong> ${!!tokens.access_token}</p>
            <p><strong>Has Refresh Token:</strong> ${!!tokens.refresh_token}</p>
            <p><strong>Expires At:</strong> ${tokens.expires_at ? new Date(tokens.expires_at * 1000).toLocaleString() : 'Never'}</p>
            <pre>${JSON.stringify({
              hasTokens: !!tokens.access_token,
              athlete: tokens.athlete,
              expires_at: tokens.expires_at,
              expires_at_formatted: tokens.expires_at ? new Date(tokens.expires_at * 1000).toLocaleString() : null
            }, null, 2)}</pre>
          </div>

          <div class="card">
            <h2>Last Activity</h2>
            <p><strong>Key:</strong> app:last_activity</p>
            <p><strong>Last Activity Date:</strong> ${lastActivity.date ? new Date(lastActivity.date).toLocaleString() : 'Never'}</p>
            <pre>${JSON.stringify(lastActivity, null, 2)}</pre>
          </div>

          <div class="card">
            <h2>Webhook Config</h2>
            <p><strong>Key:</strong> app:webhook:config</p>
            <pre>${JSON.stringify(webhookConfig, null, 2)}</pre>
          </div>

          <div style="text-align: center; margin-top: 2rem;">
            <a href="/debug" class="btn">🔙 Back to Debug</a>
            <a href="/xapp" class="btn">⚙️ Admin Panel</a>
            <a href="/health" class="btn-outline">❤️ Health Check</a>
            <a href="/redis-status" class="btn-outline">🔗 Redis Status</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Error Loading Redis Data</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
      <a href="/debug">Back to Debug</a> | <a href="/xapp">Admin</a>
    `);
  }
});

// Redis connection test
router.get('/debug/redis', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    const redisKeys = await redisClient.keys('*');
    
    res.send(`
      <h1>Redis Connection Test</h1>
      <div class="status ${redisHealth ? 'success' : 'error'}">
        <strong>Redis Connection:</strong> ${redisHealth ? '✅ Connected' : '❌ Disconnected'}
      </div>
      <p><strong>Total Keys:</strong> ${redisKeys.length}</p>
      <pre>${JSON.stringify(redisKeys, null, 2)}</pre>
      <a href="/debug">Back to Debug</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Token storage debug
router.get('/debug/tokens', async (req, res) => {
  try {
    const tokens = await getStravaTokens();
    
    res.send(`
      <h1>Token Storage Debug</h1>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
      <a href="/debug">Back to Debug</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Authentication status
router.get('/debug/auth', async (req, res) => {
  try {
    const isAuthenticated = await stravaAuth.isAuthenticated();
    const tokenInfo = await stravaAuth.getTokenInfo();
    const configStatus = stravaAuth.getConfigStatus();
    
    res.send(`
      <h1>Authentication Debug</h1>
      <p><strong>Authenticated:</strong> ${isAuthenticated ? '✅ Yes' : '❌ No'}</p>
      <h2>Token Info</h2>
      <pre>${JSON.stringify(tokenInfo, null, 2)}</pre>
      <h2>Config Status</h2>
      <pre>${JSON.stringify(configStatus, null, 2)}</pre>
      <a href="/debug">Back to Debug</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Storage contents
router.get('/debug/storage', async (req, res) => {
  try {
    const streakStats = await loadStreakStats();
    const tokens = await getStravaTokens();
    const lastActivity = await getLastActivity();
    const webhookConfig = await getWebhookConfig();
    
    res.send(`
      <h1>Storage Contents</h1>
      <h2>StreakStats</h2>
      <pre>${JSON.stringify(streakStats, null, 2)}</pre>
      <h2>Tokens</h2>
      <pre>${JSON.stringify(tokens, null, 2)}</pre>
      <h2>Last Activity</h2>
      <pre>${JSON.stringify(lastActivity, null, 2)}</pre>
      <h2>Webhook Config</h2>
      <pre>${JSON.stringify(webhookConfig, null, 2)}</pre>
      <a href="/debug">Back to Debug</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Environment variables
router.get('/debug/env', async (req, res) => {
  try {
    // Get all environment variables but filter sensitive data
    const envVars = Object.keys(process.env)
      .filter(key => !['REDIS_URL', 'CLIENT_SECRET', 'WEBHOOK_SECRET', 'ACCESS_TOKEN', 'REFRESH_TOKEN'].includes(key))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {});
    
    // Show masked versions of sensitive variables
    const sensitiveVars = {
      REDIS_URL: process.env.REDIS_URL ? '***' : 'NOT SET',
      CLIENT_SECRET: process.env.CLIENT_SECRET ? '***' : 'NOT SET',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ? '***' : 'NOT SET',
      ACCESS_TOKEN: process.env.ACCESS_TOKEN ? '***' : 'NOT SET',
      REFRESH_TOKEN: process.env.REFRESH_TOKEN ? '***' : 'NOT SET'
    };
    
    res.send(`
      <h1>Environment Variables</h1>
      <h2>Application Variables</h2>
      <pre>${JSON.stringify(envVars, null, 2)}</pre>
      <h2>Sensitive Variables (Masked)</h2>
      <pre>${JSON.stringify(sensitiveVars, null, 2)}</pre>
      <a href="/debug">Back to Debug</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Strava API test
router.get('/debug/strava-api', async (req, res) => {
  try {
    const isAuthenticated = await stravaAuth.isAuthenticated();
    
    if (!isAuthenticated) {
      return res.send(`
        <h1>Strava API Test</h1>
        <p>❌ Not authenticated. Please <a href="/auth/strava">authenticate with Strava</a> first.</p>
        <a href="/debug">Back to Debug</a>
      `);
    }
    
    try {
      const accessToken = await stravaAuth.getAccessToken();
      
      res.send(`
        <h1>Strava API Test</h1>
        <p>✅ Successfully obtained access token</p>
        <p><strong>Token:</strong> ${accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT AVAILABLE'}</p>
        <p><a href="/update-streakstats">Test API with Update</a></p>
        <a href="/debug">Back to Debug</a>
      `);
    } catch (error) {
      res.send(`
        <h1>Strava API Test</h1>
        <p>❌ Failed to get access token: ${error.message}</p>
        <p><a href="/auth/logout">Clear tokens</a> and <a href="/auth/strava">re-authenticate</a></p>
        <a href="/debug">Back to Debug</a>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

module.exports = router;
