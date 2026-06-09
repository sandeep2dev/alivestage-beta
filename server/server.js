require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bookingsRouter = require('./routes/bookings');
const adminRouter = require('./routes/admin');
const artistsRouter = require('./routes/artists');
const { registerCronJobs } = require('./services/cron');

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'alivestage-server' });
});

app.use('/api/artists', artistsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/admin', adminRouter);

registerCronJobs();

app.listen(PORT, () => {
  console.log(`[server] Alivestage API listening on port ${PORT}`);
});
