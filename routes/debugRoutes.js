const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const { loadStatsData, loadStreakData, healthCheck, getStravaTokens } = require('../config/storage');
const redisClient = require('../config/redis');
const router = express.Router();

// Debug homepage
router.get('/debug', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    const isAuthenticated = await stravaAuth.isAuthenticated();
    const tokenInfo = await stravaAuth.getTokenInfo();
    
    res.send(`
      <h1>Debug Dashboard</h1>
      
      <h2>System Status</h2>
      <p><strong>Redis Connection:</strong> ${redisHealth ? '✅ Connected' : '❌ Disconnected'}</p>
      <p><strong>Strava Authentication:</strong> ${isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</p>
      
      <h2>Debug Tools</h2>
      <ul>
        <li><a href="/debug/redis">Redis Connection Test</a></li>
        <li><a href="/debug/tokens">Token Storage Debug</a></li>
        <li><a href="/debug/auth">Authentication Status</a></li>
        <li><a href="/debug/storage">Storage Contents</a></li>
        <li><a href="/debug/env">Environment Variables</a></li>
        <li><a href="/debug/strava-api">Strava API Test</a></li>
      </ul>
      
      <h2>Authentication Info</h2>
      <pre>${JSON.stringify(tokenInfo, null, 2)}</pre>
      
      <p><a href="/">Back to Home</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

// Redis connection test
router.get('/debug/redis', async (req, res) => {
  try {
    const redisHealth = await healthCheck();
    const redisInfo = await redisClient.keys('*');
    
    res.send(`
      <h1>Redis Debug</h1>
      
      <h2>Connection Status</h2>
      <p><strong>Connected:</strong> ${redisHealth ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Connection URL:</strong> ${process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:([^:@]+)@/, ':****@') : 'NOT SET'}</p>
      
      <h2>Redis Keys</h2>
      ${redisInfo.length > 0 ? 
        `<ul>${redisInfo.map(key => `<li>${key}</li>`).join('')}</ul>` : 
        '<p>No keys found in Redis</p>'
      }
      
      <h2>Test Operations</h2>
      <form action="/debug/redis/test" method="POST">
        <button type="submit">Test Redis Read/Write</button>
      </form>
      
      <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Test Redis operations
router.post('/debug/redis/test', async (req, res) => {
  try {
    const testKey = 'debug:test';
    const testValue = { timestamp: new Date().toISOString(), message: 'Redis test successful' };
    
    // Write test
    const writeResult = await redisClient.set(testKey, testValue);
    
    // Read test
    const readResult = await redisClient.get(testKey);
    
    // Delete test
    await redisClient.del(testKey);
    
    res.send(`
      <h1>Redis Test Results</h1>
      
      <h2>Write Operation</h2>
      <p><strong>Success:</strong> ${writeResult ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Data Written:</strong></p>
      <pre>${JSON.stringify(testValue, null, 2)}</pre>
      
      <h2>Read Operation</h2>
      <p><strong>Success:</strong> ${readResult ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Data Read:</strong></p>
      <pre>${JSON.stringify(readResult, null, 2)}</pre>
      
      <p><a href="/debug/redis">Back to Redis Debug</a> | <a href="/debug">Debug Dashboard</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug/redis">Back to Redis Debug</a>`);
  }
});

// Token storage debug
router.get('/debug/tokens', async (req, res) => {
  try {
    const tokenData = await getStravaTokens();
    const debugInfo = await stravaAuth.debugTokens();
    
    res.send(`
      <h1>Token Storage Debug</h1>
      
      <h2>Raw Token Data from Redis</h2>
      <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      
      <h2>Debug Information</h2>
      <pre>${JSON.stringify(debugInfo, null, 2)}</pre>
      
      <h2>Token Actions</h2>
      <p><a href="/auth/strava">Re-authenticate with Strava</a></p>
      <p><a href="/auth/logout">Clear Tokens</a></p>
      
      <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
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
    const accessToken = await stravaAuth.getAccessToken().catch(() => null);
    
    res.send(`
      <h1>Authentication Debug</h1>
      
      <h2>Status</h2>
      <p><strong>Authenticated:</strong> ${isAuthenticated ? '✅ Yes' : '❌ No'}</p>
      <p><strong>Access Token Available:</strong> ${accessToken ? '✅ Yes' : '❌ No'}</p>
      
      <h2>Token Information</h2>
      <pre>${JSON.stringify(tokenInfo, null, 2)}</pre>
      
      <h2>Environment Variables</h2>
      <p><strong>CLIENT_ID:</strong> ${process.env.CLIENT_ID ? 'SET' : 'NOT SET'}</p>
      <p><strong>CLIENT_SECRET:</strong> ${process.env.CLIENT_SECRET ? 'SET' : 'NOT SET'}</p>
      <p><strong>REDIRECT_URI:</strong> ${process.env.REDIRECT_URI || 'NOT SET'}</p>
      
      <h2>Actions</h2>
      <p><a href="/auth/strava">Authenticate with Strava</a></p>
      <p><a href="/auth/status">Check Auth Status</a></p>
      
      <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Storage contents
router.get('/debug/storage', async (req, res) => {
  try {
    const statsData = await loadStatsData();
    const streakData = await loadStreakData();
    const tokenData = await getStravaTokens();
    
    res.send(`
      <h1>Storage Contents</h1>
      
      <h2>Stats Data</h2>
      <pre>${JSON.stringify(statsData, null, 2)}</pre>
      
      <h2>Streak Data</h2>
      <pre>${JSON.stringify(streakData, null, 2)}</pre>
      
      <h2>Token Data</h2>
      <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      
      <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
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
      REDIS_URL: process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:([^:@]+)@/, ':****@') : 'NOT SET',
      CLIENT_SECRET: process.env.CLIENT_SECRET ? 'SET' : 'NOT SET',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ? 'SET' : 'NOT SET',
      ACCESS_TOKEN: process.env.ACCESS_TOKEN ? 'SET' : 'NOT SET',
      REFRESH_TOKEN: process.env.REFRESH_TOKEN ? 'SET' : 'NOT SET'
    };
    
    res.send(`
      <h1>Environment Variables</h1>
      
      <h2>Application Variables</h2>
      <pre>${JSON.stringify(envVars, null, 2)}</pre>
      
      <h2>Sensitive Variables (Masked)</h2>
      <pre>${JSON.stringify(sensitiveVars, null, 2)}</pre>
      
      <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
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
        <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
      `);
    }
    
    try {
      const accessToken = await stravaAuth.getAccessToken();
      
      res.send(`
        <h1>Strava API Test</h1>
        
        <h2>Status</h2>
        <p>✅ Successfully obtained access token</p>
        <p><strong>Token:</strong> ${accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT AVAILABLE'}</p>
        
        <h2>Next Steps</h2>
        <p>Try accessing <a href="/update-streak">/update-streak</a> to test the full API integration.</p>
        
        <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
      `);
    } catch (error) {
      res.send(`
        <h1>Strava API Test</h1>
        
        <h2>Status</h2>
        <p>❌ Failed to get access token: ${error.message}</p>
        
        <h2>Suggested Actions</h2>
        <p><a href="/auth/logout">Clear tokens</a> and <a href="/auth/strava">re-authenticate</a></p>
        
        <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

// Force token refresh
router.get('/debug/refresh-token', async (req, res) => {
  try {
    const isAuthenticated = await stravaAuth.isAuthenticated();
    
    if (!isAuthenticated) {
      return res.send(`
        <h1>Force Token Refresh</h1>
        <p>❌ Not authenticated. Please <a href="/auth/strava">authenticate with Strava</a> first.</p>
        <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
      `);
    }
    
    try {
      const newToken = await stravaAuth.refreshTokenIfNeeded();
      
      res.send(`
        <h1>Force Token Refresh</h1>
        
        <h2>Status</h2>
        <p>✅ Token refreshed successfully</p>
        <p><strong>New Token:</strong> ${newToken ? `${newToken.substring(0, 20)}...` : 'NOT AVAILABLE'}</p>
        
        <p><a href="/debug/tokens">View Token Storage</a> | <a href="/debug">Back to Debug Dashboard</a></p>
      `);
    } catch (error) {
      res.send(`
        <h1>Force Token Refresh</h1>
        
        <h2>Status</h2>
        <p>❌ Failed to refresh token: ${error.message}</p>
        
        <h2>Suggested Actions</h2>
        <p><a href="/auth/logout">Clear tokens</a> and <a href="/auth/strava">re-authenticate</a></p>
        
        <p><a href="/debug">Back to Debug Dashboard</a> | <a href="/">Home</a></p>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/debug">Back to Debug</a>`);
  }
});

module.exports = router;
