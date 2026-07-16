const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        event_date,
        event_details,
        status,
        total_amount,
        source,
        guest_name,
        fan:profiles!bookings_fan_id_fkey(id, name),
        payments(*)
      `)
      .eq('artist_id', req.profile.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const payments = [];
    let lifetimePayout = 0;

    for (const booking of bookings || []) {
      if (booking.source === 'artist_manual') continue;

      for (const payment of booking.payments || []) {
        if (payment.status === 'refunded') continue;

        const payout = Number(payment.artist_payout_amount) || 0;
        lifetimePayout += payout;

        payments.push({
          id: payment.id,
          bookingId: booking.id,
          paymentType: payment.payment_type,
          status: payment.status,
          amountCaptured: Number(payment.amount_captured) || 0,
          platformCommission: Number(payment.platform_commission) || 0,
          artistPayout: payout,
          commissionRate: Number(payment.commission_rate_snapshot) || 0,
          updatedAt: payment.updated_at,
          eventDate: booking.event_date,
          eventDetails: booking.event_details,
          bookingStatus: booking.status,
          counterparty: booking.fan?.name || booking.guest_name || 'Fan',
        });
      }
    }

    payments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      lifetimePayout: Math.round(lifetimePayout * 100) / 100,
      payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
