// server.js (add this new route)
// Add this route to check current streak
app.get('/streak-status', async (req, res) => {
  try {
    const currentStreak = await streakLogic.getCurrentStreak();
    res.send(`
      <h1>Current Streak Status</h1>
      <p>Current Streak: ${currentStreak} days</p>
      <a href="/update-streak">Update Streak</a>
      <br>
      <a href="/">Go back</a>
    `);
  } catch (error) {
    console.error('Error getting streak status:', error);
    res.status(500).send(`
      <h1>Error</h1>
      <p>${error.message}</p>
      <a href="/">Go back</a>
    `);
  }
});
