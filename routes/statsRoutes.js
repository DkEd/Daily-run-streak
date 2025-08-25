const express = require('express');
const { getAllStats } = require('../controllers/statsController');
const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const data = await getAllStats();
    res.send(`<h1>Running Stats</h1><pre>${JSON.stringify(data, null, 2)}</pre><a href="/">Home</a>`);
  } catch (error) {
    res.status(500).send(`<h1>Error</h1><p>${error.message}</p>`);
  }
});

module.exports = router;
