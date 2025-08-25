const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Home route - simple welcome message
app.get('/', (req, res) => {
  res.send(`
    <h1>Strava API App</h1>
    <p>This app demonstrates Strava API integration hosted on Render.</p>
    <a href="/auth/strava">Connect with Strava</a>
    <p>Client ID: ${process.env.CLIENT_ID ? 'Set' : 'Not set'}</p>
  `);
});

// Initiate Strava OAuth flow
app.get('/auth/strava', (req, res) => {
  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.REDIRECT_URI}&approval_prompt=auto&scope=activity:read_all`;
  res.redirect(stravaAuthUrl);
});

// Handle Strava callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });

    const { access_token, athlete } = tokenResponse.data;
    
    res.send(`
      <h1>Successfully Connected!</h1>
      <p>Hello ${athlete.firstname} ${athlete.lastname}!</p>
      <p>Your access token: ${access_token.substring(0, 15)}...</p>
      <a href="/">Go back home</a>
    `);
  } catch (error) {
    console.error('Authentication error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed. Check your server logs for details.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
