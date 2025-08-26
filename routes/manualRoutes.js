router.get('/manual-stats-update', async (req, res) => {
  try {
    // Load current stats to pre-fill the form
    const { getAllStats } = require('../controllers/statsController');
    const currentStats = await getAllStats();
    
    res.send(`
      <h1>Manual Stats Update</h1>
      <form action="/manual-stats-update" method="POST">
        <h3>Monthly Stats</h3>
        <label for="monthlyDistance">Monthly Distance (km):</label>
        <input type="number" step="0.01" id="monthlyDistance" name="monthlyDistance" value="${currentStats.monthlyDistance}" required>
        <br>
        <label for="monthlyTime">Monthly Time (seconds):</label>
        <input type="number" id="monthlyTime" name="monthlyTime" value="${currentStats.monthlyTime}" required>
        <br>
        <label for="monthlyElevation">Monthly Elevation (meters):</label>
        <input type="number" id="monthlyElevation" name="monthlyElevation" value="${currentStats.monthlyElevation}" required>
        <br>
        <label for="monthlyGoal">Monthly Goal (km):</label>
        <input type="number" step="0.01" id="monthlyGoal" name="monthlyGoal" value="${currentStats.monthlyGoal}" required>
        
        <h3>Yearly Stats</h3>
        <label for="yearlyDistance">Yearly Distance (km):</label>
        <input type="number" step="0.01" id="yearlyDistance" name="yearlyDistance" value="${currentStats.yearlyDistance}" required>
        <br>
        <label for="yearlyTime">Yearly Time (seconds):</label>
        <input type="number" id="yearlyTime" name="yearlyTime" value="${currentStats.yearlyTime}" required>
        <br>
        <label for="yearlyElevation">Yearly Elevation (meters):</label>
        <input type="number" id="yearlyElevation" name="yearlyElevation" value="${currentStats.yearlyElevation}" required>
        <br>
        <label for="yearlyGoal">Yearly Goal (km):</label>
        <input type="number" step="0.01" id="yearlyGoal" name="yearlyGoal" value="${currentStats.yearlyGoal}" required>
        <br>
        <button type="submit">Update Stats</button>
      </form>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p><a href="/">Home</a>`);
  }
});
