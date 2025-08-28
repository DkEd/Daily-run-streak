const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const router = express.Router();

router.get('/auth/strava', (req, res) => {
  try {
    const stravaAuthUrl = stravaAuth.getAuthUrl();
    console.log('Redirecting to Strava auth:', stravaAuthUrl);
    res.redirect(stravaAuthUrl);
  } catch (error) {
    console.error('Auth redirect error:', error);
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/auth/callback', async (req, res) => {
  try {
    console.log('Auth callback received, code:', req.query.code ? 'PRESENT' : 'MISSING');
    
    if (!req.query.code) {
      return res.status(400).send('<h1>Error</h1><p>Authorization code missing</p><a href="/xapp">Back to App</a>');
    }

    const tokenData = await stravaAuth.exchangeCodeForToken(req.query.code);
    res.send(`
      <h1>Authenticated Successfully! ✅</h1>
      <p>Hello ${tokenData.athlete.firstname} ${tokenData.athlete.lastname}!</p>
      <p>Your access token has been saved to Redis.</p>
      <p><a href="/xapp">Go to App</a></p>
    `);
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <p>Please try <a href="/auth/strava">re-authenticating</a>.</p>
      <a href="/xapp">Back to App</a>
    `);
  }
});

router.get('/auth/status', async (req, res) => {
  try {
    const tokenInfo = await stravaAuth.getTokenInfo();
    
    if (tokenInfo.hasTokens) {
      res.send(`
        <h1>Authentication Status</h1>
        <p><strong>Authenticated as:</strong> ${tokenInfo.athlete.firstname} ${tokenInfo.athlete.lastname}</p>
        <p><strong>Token expires:</strong> ${tokenInfo.expiresAt}</p>
        <p><strong>Expires in:</strong> ${tokenInfo.expiresInFormatted}</p>
        <p><a href="/auth/logout">Logout</a> | <a href="/xapp">Back to App</a></p>
      `);
    } else {
      res.send(`
        <h1>Authentication Status</h1>
        <p><strong>Status:</strong> Not authenticated</p>
        <p><a href="/auth/strava">Authenticate with Strava</a> | <a href="/xapp">Back to App</a></p>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/auth/logout', async (req, res) => {
  try {
    await stravaAuth.clearTokens();
    res.send(`
      <h1>Logged Out Successfully</h1>
      <p>You have been successfully logged out. All tokens have been cleared from Redis.</p>
      <a href="/xapp">Back to App</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

module.exports = router;
