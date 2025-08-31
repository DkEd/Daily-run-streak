const express = require('express');
const authRoutes = require('./routes/authRoutes');
const streakstatsRoutes = require('./routes/streakstatsRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const debugRoutes = require('./routes/debugRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const stravaAuth = require('./services/stravaAuth');
const { initializeData, healthCheck } = require('./config/storage');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize data on startup
initializeData().then(() => {
  console.log('Data initialization completed');
}).catch((error) => {
  console.error('Data initialization failed:', error.message);
  console.log('Continuing with in-memory storage...');
});

// Routes
app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', streakstatsRoutes);
app.use('/', webhookRoutes);
app.use('/', debugRoutes);
app.use('/', adminRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisHealth = await healthCheck();
  const status = redisHealth ? 200 : 500;
  res.status(status).json({
    status: redisHealth ? 'OK' : 'Error',
    redis: redisHealth ? 'Connected to Upstash' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Redis connection status endpoint
app.get('/redis-status', async (req, res) => {
  const redisHealth = await healthCheck();
  if (redisHealth) {
    res.send('<h1>Redis Status: Connected to Upstash ✅</h1><a href="/xapp">Back to App</a>');
  } else {
    res.status(500).send('<h1>Redis Status: Disconnected ❌</h1><p>Check your Redis configuration</p><a href="/xapp">Back to App</a>');
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  
  // Test Redis connection
  const redisHealthy = await healthCheck();
  if (redisHealthy) {
    console.log('Upstash Redis connection established successfully');
  } else {
    console.log('Upstash Redis connection failed - check your REDIS_URL configuration');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
