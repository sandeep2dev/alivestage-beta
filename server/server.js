const path = require('path');
const rootEnv = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(rootEnv, '.env.local') });
require('dotenv').config({ path: path.join(rootEnv, '.env') });

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const eventsRouter = require('./routes/events');
const ratingsRouter = require('./routes/ratings');
const webhooksRouter = require('./routes/webhooks');
const { registerCronJobs } = require('./services/cron');
const { getAllowedOrigins, createCorsOriginChecker } = require('./config/corsOrigins');

const app = express();
const PORT = process.env.PORT || 5001;
const { razorpayStatus } = require('./services/payment');
const rpStatus = razorpayStatus();

app.use(cors({ origin: createCorsOriginChecker(), credentials: true }));

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

if (!rpStatus.configured) {
  console.warn(
    '[server] Razorpay keys missing — join/create fees run in MOCK mode (no checkout modal). Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local and restart the API.'
  );
}

app.listen(PORT, () => {
  console.log(`[server] Alivestage community API listening on port ${PORT}`);
  console.log('[server] CORS allowed origins:', getAllowedOrigins().join(', '));
  if (!rpStatus.configured) {
    console.log('[server] Razorpay: MOCK (skips payment modal)');
  } else {
    console.log(
      `[server] Razorpay: ${rpStatus.mode} mode Standard Checkout` +
        (rpStatus.local ? ' (NEXT_PUBLIC_APP_URL is localhost → test keys required)' : '')
    );
  }
});
