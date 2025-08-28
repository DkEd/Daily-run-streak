const { getStravaTokens } = require('../config/storage');

async function checkAuth(req, res, next) {
  try {
    const tokens = await getStravaTokens();
    const yourAthleteId = process.env.STRAVA_ATHLETE_ID;
    
    if (tokens && tokens.athlete && tokens.athlete.id.toString() === yourAthleteId) {
      res.locals.isAuthorized = true;
      res.locals.athlete = tokens.athlete;
    } else {
      res.locals.isAuthorized = false;
    }
    
    next();
  } catch (error) {
    console.error('Auth check error:', error);
    res.locals.isAuthorized = false;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!res.locals.isAuthorized) {
    return res.status(403).send(`
      <h1>Access Denied</h1>
      <p>This tool is for personal use only.</p>
      <p><a href="/auth/strava">Authenticate with Strava</a> | <a href="/">Home</a></p>
    `);
  }
  next();
}

module.exports = { checkAuth, requireAuth };
