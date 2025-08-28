const express = require('express');
const { getAllStats, resetMonthlyStats, resetYearlyStats } = require('../controllers/statsController');
const refreshDataMiddleware = require('../middleware/refreshData');
const { metersToKm, formatTime } = require('../utils/formatters');
const router = express.Router();

// Apply middleware to stats route
router.use(refreshDataMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const data = await getAllStats();
    
    res.send(`
      <h1>Running Stats</h1>
      
      <h2>Monthly Stats</h2>
      <p><strong>Distance:</strong> ${metersToKm(data.monthlyDistance)} km / ${metersToKm(data.monthlyGoal)} km</p>
      <p><strong>Time:</strong> ${formatTime(data.monthlyTime)}</p>
      <p><strong>Elevation:</strong> ${data.monthlyElevation} m</p>
      
      <h2>Yearly Stats</h2>
      <p><strong>Distance:</strong> ${metersToKm(data.yearlyDistance)} km / ${metersToKm(data.yearlyGoal)} km</p>
      <p><strong>Time:</strong> ${formatTime(data.yearlyTime)}</p>
      <p><strong>Elevation:</strong> ${data.yearlyElevation} m</p>
      
      <p><strong>Update Mode:</strong> ${data.manuallyUpdated ? 'Manual (values preserved)' : 'Auto (updates with runs)'}</p>
      <p><strong>Last Updated:</strong> ${new Date(data.lastUpdated).toLocaleString()}</p>
      
      <h2>Actions</h2>
      <p><a href="/manual-stats-update">Update Stats Manually</a></p>
      <p><a href="/reset-monthly-stats">Reset Monthly Stats</a></p>
      <p><a href="/reset-yearly-stats">Reset Yearly Stats</a></p>
      <p><a href="/toggle-stats-mode">Toggle Auto/Manual Mode</a></p>
      
      <h2>Raw Data</h2>
      <pre>${JSON.stringify(data, null, 2)}</pre>
      
      <a href="/xapp">Back to App</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/reset-monthly-stats', async (req, res) => {
  try {
    const result = await resetMonthlyStats();
    res.send(`<h1>Monthly Stats Reset</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/xapp">Back to App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

router.get('/reset-yearly-stats', async (req, res) => {
  try {
    const result = await resetYearlyStats();
    res.send(`<h1>Yearly Stats Reset</h1><p>${result.message}</p><pre>${JSON.stringify(result.data, null, 2)}</pre><a href="/xapp">Back to App</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/xapp">Back to App</a>`);
  }
});

module.exports = router;
