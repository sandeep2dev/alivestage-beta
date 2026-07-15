const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        event_date,
        status,
        artist:profiles!bookings_artist_id_fkey(id, name),
        payments(*)
      `)
      .eq('fan_id', req.profile.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const transactions = [];
    for (const booking of bookings || []) {
      for (const payment of booking.payments || []) {
        transactions.push({
          id: payment.id,
          bookingId: booking.id,
          paymentType: payment.payment_type,
          status: payment.status,
          amount: payment.amount_captured,
          razorpayPaymentId: payment.razorpay_payment_id,
          updatedAt: payment.updated_at,
          eventDate: booking.event_date,
          bookingStatus: booking.status,
          artist: booking.artist,
        });
      }
    }

    transactions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
