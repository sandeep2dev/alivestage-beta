const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature, refundPayment, splitAmount } = require('../services/payment');
const { sendMail, bookingRequestHtml, bookingAcceptedHtml, bookingRejectedHtml } = require('../services/email');

const router = express.Router();
const TOKEN_RATIO = 0.2;

router.post('/create', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    const { artistId, eventDetails, venueLocation, eventDate, durationHours } = req.body;
    if (!artistId || !eventDetails || !venueLocation || !eventDate || !durationHours) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const { data: artist } = await supabase
      .from('artist_details')
      .select('*, profile:profiles!artist_details_id_fkey(name, email)')
      .eq('id', artistId)
      .eq('is_onboarded', true)
      .single();

    if (!artist) {
      return res.status(400).json({ message: 'Artist not available' });
    }

    const { data: settings } = await supabase.from('platform_settings').select('commission_percentage').eq('id', 1).single();
    const commissionRate = settings?.commission_percentage ?? 10;

    const hourlyTotal = Number(artist.hourly_rate) * Number(durationHours);
    const totalAmount = Math.max(Number(artist.min_booking_amount), hourlyTotal);
    const tokenAmount = Math.round(totalAmount * TOKEN_RATIO * 100) / 100;
    const remainingAmount = Math.round((totalAmount - tokenAmount) * 100) / 100;

    const eventDateObj = new Date(eventDate);
    const now = new Date();
    const artistResponseDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const balanceDueDeadline = new Date(eventDateObj.getTime() - 48 * 60 * 60 * 1000);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        fan_id: req.profile.id,
        artist_id: artistId,
        event_details: eventDetails,
        venue_location: venueLocation,
        event_date: eventDate,
        duration_hours: durationHours,
        total_amount: totalAmount,
        token_amount: tokenAmount,
        remaining_amount: remainingAmount,
        commission_rate_snapshot: commissionRate,
        artist_response_deadline: artistResponseDeadline.toISOString(),
        balance_due_deadline: balanceDueDeadline.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError) {
      return res.status(500).json({ message: bookingError.message });
    }

    const { platformCommission, artistPayout } = splitAmount(tokenAmount, commissionRate);
    const { mock, order } = await createOrder({
      amount: tokenAmount,
      receipt: `tk_${booking.id.slice(0, 8)}`,
      notes: { bookingId: booking.id, type: 'token' },
      artistLinkedAccountId: artist.razorpay_linked_account_id,
      artistShare: artistPayout,
    });

    if (artist.profile?.email) {
      await sendMail({
        to: artist.profile.email,
        subject: 'New booking request on Alivestage',
        html: bookingRequestHtml({
          artistName: artist.profile.name,
          fanName: req.profile.name,
          eventDate: new Date(eventDate).toLocaleString(),
          eventDetails,
          venue: venueLocation,
        }),
      });
    }

    res.status(201).json({
      bookingId: booking.id,
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || '',
      mock: !!mock,
      totalAmount,
      tokenAmount,
      remainingAmount,
    });
  } catch (err) {
    console.error('[bookings/create]', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-token', requireAuth, async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('fan_id', req.profile.id)
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { platformCommission, artistPayout } = splitAmount(
      booking.token_amount,
      booking.commission_rate_snapshot
    );

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('payment_type', 'token')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('payments')
        .update({ razorpay_payment_id, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('payments').insert({
        booking_id: bookingId,
        razorpay_order_id,
        razorpay_payment_id,
        amount_captured: booking.token_amount,
        commission_rate_snapshot: booking.commission_rate_snapshot,
        platform_commission: platformCommission,
        artist_payout_amount: artistPayout,
        payment_type: 'token',
        status: 'token_paid',
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/accept', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, fan:profiles!bookings_fan_id_fkey(email, name)')
      .eq('id', req.params.id)
      .eq('artist_id', req.profile.id)
      .eq('status', 'pending')
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);

    if (booking.fan?.email) {
      await sendMail({
        to: booking.fan.email,
        subject: 'Artist accepted your booking',
        html: bookingAcceptedHtml({
          fanName: booking.fan.name,
          artistName: req.profile.name,
          remainingAmount: booking.remaining_amount,
        }),
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/reject', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, fan:profiles!bookings_fan_id_fkey(email, name)')
      .eq('id', req.params.id)
      .eq('artist_id', req.profile.id)
      .eq('status', 'pending')
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { data: tokenPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking.id)
      .eq('payment_type', 'token')
      .single();

    if (tokenPayment?.razorpay_payment_id) {
      await refundPayment(tokenPayment.razorpay_payment_id, tokenPayment.amount_captured);
      await supabase
        .from('payments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', tokenPayment.id);
    }

    await supabase.from('bookings').update({ status: 'rejected' }).eq('id', booking.id);

    if (booking.fan?.email) {
      await sendMail({
        to: booking.fan.email,
        subject: 'Booking request declined',
        html: bookingRejectedHtml({ fanName: booking.fan.name, artistName: req.profile.name }),
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay-balance', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .eq('fan_id', req.profile.id)
      .eq('status', 'confirmed')
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { data: artistDetails } = await supabase
      .from('artist_details')
      .select('razorpay_linked_account_id')
      .eq('id', booking.artist_id)
      .single();

    const { artistPayout } = splitAmount(
      booking.remaining_amount,
      booking.commission_rate_snapshot
    );

    const { mock, order } = await createOrder({
      amount: booking.remaining_amount,
      receipt: `bl_${booking.id.slice(0, 8)}`,
      notes: { bookingId: booking.id, type: 'balance' },
      artistLinkedAccountId: artistDetails?.razorpay_linked_account_id,
      artistShare: artistPayout,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || '',
      mock: !!mock,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-balance', requireAuth, async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('fan_id', req.profile.id)
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const { platformCommission, artistPayout } = splitAmount(
      booking.remaining_amount,
      booking.commission_rate_snapshot
    );

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('payment_type', 'balance')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('payments')
        .update({ razorpay_payment_id, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('payments').insert({
        booking_id: bookingId,
        razorpay_order_id,
        razorpay_payment_id,
        amount_captured: booking.remaining_amount,
        commission_rate_snapshot: booking.commission_rate_snapshot,
        platform_commission: platformCommission,
        artist_payout_amount: artistPayout,
        payment_type: 'balance',
        status: 'fully_paid',
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/complete', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .eq('fan_id', req.profile.id)
      .eq('status', 'confirmed')
      .single();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    await supabase.from('bookings').update({ status: 'completed_by_fan' }).eq('id', booking.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/mine', requireAuth, async (req, res) => {
  try {
    let query = supabase
      .from('bookings')
      .select(`
        *,
        fan:profiles!bookings_fan_id_fkey(id, name, email),
        artist:profiles!bookings_artist_id_fkey(id, name, email),
        payments(*)
      `)
      .order('created_at', { ascending: false });

    if (req.profile.role === 'fan') {
      query = query.eq('fan_id', req.profile.id);
    } else if (req.profile.role === 'artist') {
      query = query.eq('artist_id', req.profile.id);
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
