const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const router = express.Router();

router.get('/auth/strava', (req, res) => {
  try {
    const stravaAuthUrl = stravaAuth.getAuthUrl();
    res.redirect(stravaAuthUrl);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

router.get('/auth/callback', async (req, res) => {
  try {
    if (!req.query.code) {
      return res.status(400).send('<h1>Error</h1><p>Authorization code missing</p><a href="/">Home</a>');
    }

    const tokenData = await stravaAuth.exchangeCodeForToken(req.query.code);
    res.send(`<h1>Authenticated!</h1><p>Hello ${tokenData.athlete.firstname}! <a href="/">Continue</a></p>`);
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><p>Please try <a href="/auth/strava">re-authenticating</a>.</p><a href="/">Home</a>`);
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
        <p><strong>Expires in:</strong> ${tokenInfo.expiresIn} seconds</p>
        <p><a href="/auth/logout">Logout</a> | <a href="/">Home</a></p>
      `);
    } else {
      res.send(`
        <h1>Authentication Status</h1>
        <p><strong>Status:</strong> Not authenticated</p>
        <p><a href="/auth/strava">Authenticate with Strava</a> | <a href="/">Home</a></p>
      `);
    }
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

router.get('/auth/logout', async (req, res) => {
  try {
    await stravaAuth.clearTokens();
    res.send(`<h1>Logged Out</h1><p>You have been successfully logged out.</p><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});

module.exports = router;
