const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth, requireRole, requireSuperadmin } = require('../middleware/auth');
const { refundPayment, releaseTransfer, splitAmount } = require('../services/payment');

const router = express.Router();

router.use(requireAuth, requireRole('admin', 'superadmin'));

router.get('/bookings', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        fan:profiles!bookings_fan_id_fkey(id, name, email),
        artist:profiles!bookings_artist_id_fkey(id, name, email),
        venue_city:cities!bookings_venue_city_id_fkey(id, name, state, tier),
        payments(*)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/artists', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('artist_details')
      .select('*, profile:profiles!artist_details_id_fkey(id, name, email), city:cities!artist_details_city_id_fkey(id, name, state, tier)')
      .order('updated_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/settings/commission', requireSuperadmin, async (req, res) => {
  try {
    const { commissionPercentage } = req.body;
    if (commissionPercentage == null || commissionPercentage < 0 || commissionPercentage > 100) {
      return res.status(400).json({ message: 'Invalid commission percentage' });
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .update({
        commission_percentage: commissionPercentage,
        updated_at: new Date().toISOString(),
        updated_by_id: req.profile.id,
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/artists/:id/payout-account', requireSuperadmin, async (req, res) => {
  try {
    const { razorpayLinkedAccountId } = req.body;
    const { data, error } = await supabase
      .from('artist_details')
      .update({ razorpay_linked_account_id: razorpayLinkedAccountId })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bookings/:id/refund', requireSuperadmin, async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, payments(*)')
      .eq('id', req.params.id)
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    for (const payment of booking.payments || []) {
      if (payment.razorpay_payment_id && payment.status !== 'refunded') {
        await refundPayment(payment.razorpay_payment_id, payment.amount_captured);
        await supabase
          .from('payments')
          .update({
            status: 'refunded',
            processed_by_admin_id: req.profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);
      }
    }

    await supabase.from('bookings').update({ status: 'rejected' }).eq('id', booking.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/bookings/:id/payout', requireSuperadmin, async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, payments(*)')
      .eq('id', req.params.id)
      .eq('status', 'completed_by_fan')
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found or not completed' });

    const paidPayments = (booking.payments || []).filter(
      (p) => p.status === 'token_paid' || p.status === 'fully_paid'
    );
    const totalCaptured = paidPayments.reduce((sum, p) => sum + Number(p.amount_captured), 0);
    const { platformCommission, artistPayout } = splitAmount(
      totalCaptured,
      booking.commission_rate_snapshot
    );

    for (const payment of paidPayments) {
      if (payment.razorpay_transfer_id) {
        await releaseTransfer(payment.razorpay_transfer_id);
      }
      await supabase
        .from('payments')
        .update({
          status: 'released_to_artist',
          platform_commission: platformCommission,
          artist_payout_amount: artistPayout,
          processed_by_admin_id: req.profile.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    await supabase.from('bookings').update({ status: 'settled' }).eq('id', booking.id);
    res.json({ success: true, platformCommission, artistPayout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
