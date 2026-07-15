require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const artistsRouter = require('./routes/artists');
const { registerCronJobs } = require('./services/cron');

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '8mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'alivestage-server' });
});

app.use('/api/auth', authRouter);
app.use('/api/cities', require('./routes/cities'));
app.use('/api/artists', artistsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/support', require('./routes/support'));
app.use('/api/admin', adminRouter);

registerCronJobs();

if (!process.env.JWT_SECRET) {
  console.warn('[server] JWT_SECRET is not set — OTP login will fail until it is configured');
}

app.listen(PORT, () => {
  console.log(`[server] Alivestage API listening on port ${PORT}`);
});
