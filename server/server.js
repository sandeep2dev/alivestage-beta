require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const eventsRouter = require('./routes/events');
const ratingsRouter = require('./routes/ratings');
const webhooksRouter = require('./routes/webhooks');
const { registerCronJobs } = require('./services/cron');

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin, credentials: true }));

// Razorpay webhooks need the raw body for HMAC verification
app.use(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  webhooksRouter
);

app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'alivestage-server' });
});

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/support', require('./routes/support'));
app.use('/api/cities', require('./routes/cities'));

registerCronJobs();

if (!process.env.JWT_SECRET) {
  console.warn('[server] JWT_SECRET is not set — OTP login will fail until it is configured');
}

app.listen(PORT, () => {
  console.log(`[server] Alivestage community API listening on port ${PORT}`);
});
