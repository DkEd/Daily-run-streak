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

module.exports = router;
