# Strava Run Streak Updater

A Node.js application that tracks your Strava running streak and updates activity descriptions with your stats.

## Features

- 📊 Track running statistics (monthly and yearly)
- 🔥 Maintain and display running streaks
- 🔔 Webhook support for automatic updates
- 🗂️ Redis-based data storage for persistence
- 🔐 OAuth authentication with Strava
- 📝 Automatic activity description updates

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your environment variables
4. Set up a Redis server (local or cloud)
5. Start the application: `npm start`

## Environment Variables

- `REDIS_URL`: Your Redis connection URL
- `CLIENT_ID`: Strava app client ID
- `CLIENT_SECRET`: Strava app client secret
- `REDIRECT_URI`: Strava OAuth redirect URI
- `WEBHOOK_VERIFY_TOKEN`: Webhook verification token
- `WEBHOOK_SECRET`: Webhook secret for signature verification
- `PORT`: Server port (default: 3000)
- `RENDER_EXTERNAL_URL`: Your external URL (for webhooks)

## Usage

1. Visit the home page and authenticate with Strava
2. Use `/update-streak` to manually update your streak
3. Set up webhooks for automatic updates
4. View your stats at `/stats` and streak details at `/streak-details`

## API Endpoints

- `GET /`: Home page with navigation
- `GET /auth/strava`: Initiate Strava authentication
- `GET /auth/callback`: Strava OAuth callback
- `GET /update-streak`: Manually update streak
- `GET /streak-status`: Check current streak
- `GET /streak-details`: View detailed streak info
- `GET /stats`: View running statistics
- `GET /webhook`: Webhook verification endpoint
- `POST /webhook`: Webhook processing endpoint
- `GET /setup-webhook`: Set up Strava webhooks
- `GET /health`: Health check endpoint

## Webhook Setup

1. Visit `/setup-webhook` to create a webhook subscription
2. Strava will send activity creation events to your webhook endpoint
3. The app will automatically process new activities and update descriptions

## License

MIT
