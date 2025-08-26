const express = require('express');
const { manuallyUpdateStreak } = require('../controllers/streakController');
const { manuallyUpdateStats, getAllStats } = require('../controllers/statsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const router = express.Router();

// Apply middleware to manual routes
router.use(refreshDataMiddleware);

router.get('/manual-streak-update', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Manual Streak Update</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        form { background: #f9f9f9; padding: 20px; border-radius: 5px; }
        label { display: block; margin: 10px 0 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #fc4c02; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #e04402; }
        a { color: #fc4c02; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Manual Streak Update</h1>
      <form action="/manual-streak-update" method="POST">
        <label for="currentStreak">Current Streak (days):</label>
        <input type="number" id="currentStreak" name="currentStreak" value="0" min="0" required>
        
        <label for="longestStreak">Longest Streak (days):</label>
        <input type="number" id="longestStreak" name="longestStreak" value="0" min="0" required>
        
        <label for="totalRuns">Total Runs:</label>
        <input type="number" id="totalRuns" name="totalRuns" value="0" min="0" required>
        
        <label for="totalDistance">Total Distance (km):</label>
        <input type="text" pattern="[0-9]+(\\.[0-9]{1,2})?" title="Enter a number with up to 2 decimal places (e.g., 2346.60)" id="totalDistance" name="totalDistance" value="0" required>
        
        <label for="totalTime">Total Time (seconds):</label>
        <input type="number" id="totalTime" name="totalTime" value="0" min="0" required>
        
        <label for="totalElevation">Total Elevation (meters):</label>
        <input type="number" id="totalElevation" name="totalElevation" value="0" min="0" required>
        
        <label for="streakStartDate">Streak Start Date (YYYY-MM-DD):</label>
        <input type="date" id="streakStartDate" name="streakStartDate" required>
        
        <label for="manuallyUpdated">Manually Updated:</label>
        <select id="manuallyUpdated" name="manuallyUpdated">
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
        
        <button type="submit">Update Streak</button>
      </form>
      <p><a href="/">← Go back to Home</a></p>
    </body>
    </html>
  `);
});

router.post('/manual-streak-update', async (req, res) => {
  try {
    // Convert text inputs to numbers
    const updates = {
      ...req.body,
      currentStreak: parseInt(req.body.currentStreak) || 0,
      longestStreak: parseInt(req.body.longestStreak) || 0,
      totalRuns: parseInt(req.body.totalRuns) || 0,
      totalDistance: parseFloat(req.body.totalDistance) || 0,
      totalTime: parseInt(req.body.totalTime) || 0,
      totalElevation: parseInt(req.body.totalElevation) || 0,
      manuallyUpdated: req.body.manuallyUpdated === 'true'
    };
    
    const result = await manuallyUpdateStreak(updates);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual Update Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
          a { color: #fc4c02; text-decoration: none; margin-right: 15px; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Manual Update Result</h1>
        <p>${result.message}</p>
        <h2>Updated Streak Data:</h2>
        <pre>${JSON.stringify(result.data, null, 2)}</pre>
        <p>
          <a href="/streak-details">View Streak Details</a>
          <a href="/manual-streak-update">Update Again</a>
          <a href="/">Home</a>
        </p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #d32f2f; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p>${error.message}</p>
        <p><a href="/manual-streak-update">← Try Again</a> | <a href="/">Home</a></p>
      </body>
      </html>
    `);
  }
});

router.get('/manual-stats-update', async (req, res) => {
  try {
    const currentStats = await getAllStats();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual Stats Update</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1, h3 { color: #333; }
          form { background: #f9f9f9; padding: 20px; border-radius: 5px; }
          label { display: block; margin: 10px 0 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #fc4c02; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #e04402; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Manual Stats Update</h1>
        <form action="/manual-stats-update" method="POST">
          <h3>Monthly Stats</h3>
          <label for="monthlyDistance">Monthly Distance (km):</label>
          <input type="text" pattern="[0-9]+(\\.[0-9]{1,2})?" title="Enter a number with up to 2 decimal places (e.g., 125.75)" id="monthlyDistance" name="monthlyDistance" value="${currentStats.monthlyDistance}" required>
          
          <label for="monthlyTime">Monthly Time (seconds):</label>
          <input type="number" id="monthlyTime" name="monthlyTime" value="${currentStats.monthlyTime}" min="0" required>
          
          <label for="monthlyElevation">Monthly Elevation (meters):</label>
          <input type="number" id="monthlyElevation" name="monthlyElevation" value="${currentStats.monthlyElevation}" min="0" required>
          
          <label for="monthlyGoal">Monthly Goal (km):</label>
          <input type="text" pattern="[0-9]+(\\.[0-9]{1,2})?" title="Enter a number with up to 2 decimal places (e.g., 250.00)" id="monthlyGoal" name="monthlyGoal" value="${currentStats.monthlyGoal}" required>
          
          <h3>Yearly Stats</h3>
          <label for="yearlyDistance">Yearly Distance (km):</label>
          <input type="text" pattern="[0-9]+(\\.[0-9]{1,2})?" title="Enter a number with up to 2 decimal places (e.g., 1250.50)" id="yearlyDistance" name="yearlyDistance" value="${currentStats.yearlyDistance}" required>
          
          <label for="yearlyTime">Yearly Time (seconds):</label>
          <input type="number" id="yearlyTime" name="yearlyTime" value="${currentStats.yearlyTime}" min="0" required>
          
          <label for="yearlyElevation">Yearly Elevation (meters):</label>
          <input type="number" id="yearlyElevation" name="yearlyElevation" value="${currentStats.yearlyElevation}" min="0" required>
          
          <label for="yearlyGoal">Yearly Goal (km):</label>
          <input type="text" pattern="[0-9]+(\\.[0-9]{1,2})?" title="Enter a number with up to 2 decimal places (e.g., 3250.00)" id="yearlyGoal" name="yearlyGoal" value="${currentStats.yearlyGoal}" required>
          
          <button type="submit">Update Stats</button>
        </form>
        <p><a href="/">← Go back to Home</a></p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #d32f2f; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p>${error.message}</p>
        <p><a href="/">Home</a></p>
      </body>
      </html>
    `);
  }
});

router.post('/manual-stats-update', async (req, res) => {
  try {
    // Convert text inputs to numbers
    const updates = {
      monthlyDistance: parseFloat(req.body.monthlyDistance) || 0,
      monthlyTime: parseInt(req.body.monthlyTime) || 0,
      monthlyElevation: parseInt(req.body.monthlyElevation) || 0,
      monthlyGoal: parseFloat(req.body.monthlyGoal) || 0,
      yearlyDistance: parseFloat(req.body.yearlyDistance) || 0,
      yearlyTime: parseInt(req.body.yearlyTime) || 0,
      yearlyElevation: parseInt(req.body.yearlyElevation) || 0,
      yearlyGoal: parseFloat(req.body.yearlyGoal) || 0
    };
    
    const result = await manuallyUpdateStats(updates);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual Update Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow: auto; }
          a { color: #fc4c02; text-decoration: none; margin-right: 15px; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Manual Update Result</h1>
        <p>${result.message}</p>
        <h2>Updated Stats Data:</h2>
        <pre>${JSON.stringify(result.data, null, 2)}</pre>
        <p>
          <a href="/stats">View Stats</a>
          <a href="/manual-stats-update">Update Again</a>
          <a href="/">Home</a>
        </p>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #d32f2f; }
          a { color: #fc4c02; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p>${error.message}</p>
        <p><a href="/manual-stats-update">← Try Again</a> | <a href="/">Home</a></p>
      </body>
      </html>
    `);
  }
});

module.exports = router;