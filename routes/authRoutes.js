const express = require('express');
const stravaAuth = require('../services/stravaAuth');
const router = express.Router();

router.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = stravaAuth.getAuthUrl();
  res.redirect(stravaAuthUrl);
});

router.get('/auth/callback', async (req, res) => {
  try {
    const tokenData = await stravaAuth.exchangeCodeForToken(req.query.code);
    res.send(`<h1>Authenticated!</h1><p>Hello ${tokenData.athlete.firstname}! <a href="/">Continue</a></p>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

module.exports = router;
