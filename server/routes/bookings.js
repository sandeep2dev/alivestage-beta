const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createOrder, verifyPaymentSignature } = require('../services/payment');
const { sendMail, bookingRequestHtml } = require('../services/email');
const { confirmBooking, declineBooking } = require('../services/bookingActions');
const { toWhatsAppRecipient } = require('../lib/phone');
const { sendBookingRequestMessage } = require('../services/whatsapp');

const router = express.Router();

/** Token = platform commission (default 10% of artist fee). Not an advance on the fee. */
const TOKEN_RATIO = 0.1;

function hasVerifiedWhatsApp(profile) {
  return Boolean(profile?.phone && profile?.whatsapp_verified_at);
}

router.post('/manual', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const {
      guestName,
      eventDetails,
      venueCityId,
      venueLocation,
      eventDate,
      durationHours,
      totalAmount,
    } = req.body || {};

    if (!guestName || !eventDetails || !venueCityId || !venueLocation || !eventDate || !durationHours || totalAmount == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const name = String(guestName).trim();
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Guest name must be 2–80 characters' });
    }

    const details = String(eventDetails).trim();
    if (details.length < 10 || details.length > 2000) {
      return res.status(400).json({ message: 'Event details must be 10–2000 characters' });
    }

    const address = String(venueLocation).trim();
    if (address.length < 5 || address.length > 500) {
      return res.status(400).json({ message: 'Venue address must be 5–500 characters' });
    }

    const hours = Number(durationHours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      return res.status(400).json({ message: 'Duration must be between 1 and 24 hours' });
    }

    const amount = Number(totalAmount);
    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ message: 'Total amount must be at least ₹1' });
    }

    const eventDateObj = new Date(eventDate);
    if (Number.isNaN(eventDateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid event date' });
    }

    const { data: venueCity } = await supabase
      .from('cities')
      .select('id, name, state')
      .eq('id', venueCityId)
      .maybeSingle();
    if (!venueCity) {
      return res.status(400).json({ message: 'Invalid venue city' });
    }

    const { data: artist } = await supabase
      .from('artist_details')
      .select('id, is_onboarded')
      .eq('id', req.profile.id)
      .eq('is_onboarded', true)
      .maybeSingle();
    if (!artist) {
      return res.status(400).json({ message: 'Complete onboarding before adding bookings' });
    }

    const deadline = eventDateObj.toISOString();
    const rounded = Math.round(amount * 100) / 100;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        fan_id: null,
        artist_id: req.profile.id,
        guest_name: name,
        source: 'artist_manual',
        event_details: details,
        venue_city_id: venueCityId,
        venue_location: address,
        event_date: eventDateObj.toISOString(),
        duration_hours: hours,
        total_amount: rounded,
        token_amount: 0,
        remaining_amount: rounded,
        commission_rate_snapshot: 0,
        artist_response_deadline: deadline,
        balance_due_deadline: deadline,
        status: 'confirmed',
      })
      .select(`
        *,
        fan:profiles!bookings_fan_id_fkey(id, name, email),
        artist:profiles!bookings_artist_id_fkey(id, name, email),
        venue_city:cities!bookings_venue_city_id_fkey(id, name, state, tier),
        payments(*)
      `)
      .single();

    if (bookingError) {
      return res.status(500).json({ message: bookingError.message });
    }

    res.status(201).json(booking);
  } catch (err) {
    console.error('[bookings/manual]', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Fan creates a booking request (no payment yet).
 * Requires verified WhatsApp on fan + artist.
 */
router.post('/create', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    if (!hasVerifiedWhatsApp(req.profile)) {
      return res.status(400).json({
        message: 'Verify your WhatsApp number before booking',
        code: 'WHATSAPP_REQUIRED',
      });
    }

    const { artistId, eventDetails, venueCityId, venueLocation, eventDate, durationHours } = req.body;
    if (!artistId || !eventDetails || !venueCityId || !venueLocation || !eventDate || !durationHours) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const { data: venueCity } = await supabase
      .from('cities')
      .select('id, name, state')
      .eq('id', venueCityId)
      .maybeSingle();
    if (!venueCity) {
      return res.status(400).json({ message: 'Invalid venue city' });
    }

    const { data: artist } = await supabase
      .from('artist_details')
      .select('*, profile:profiles!artist_details_id_fkey(id, name, email, phone, whatsapp_verified_at)')
      .eq('id', artistId)
      .eq('is_onboarded', true)
      .single();

    if (!artist) {
      return res.status(400).json({ message: 'Artist not available' });
    }
    if (!hasVerifiedWhatsApp(artist.profile)) {
      return res.status(400).json({ message: 'This artist cannot receive booking requests right now' });
    }

    const { data: settings } = await supabase
      .from('platform_settings')
      .select('commission_percentage')
      .eq('id', 1)
      .single();
    const commissionRate = Number(settings?.commission_percentage ?? 10);
    const tokenRatio = commissionRate / 100;

    const hourlyTotal = Number(artist.hourly_rate) * Number(durationHours);
    const totalAmount = Math.max(Number(artist.min_booking_amount), hourlyTotal);
    const tokenAmount = Math.round(totalAmount * tokenRatio * 100) / 100;
    // Artist collects the full performance fee off-platform
    const remainingAmount = Math.round(totalAmount * 100) / 100;

    const eventDateObj = new Date(eventDate);
    const now = new Date();
    const artistResponseDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    // Legacy column — unused in new flow (no on-platform balance)
    const balanceDueDeadline = new Date(eventDateObj.getTime() - 48 * 60 * 60 * 1000);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        fan_id: req.profile.id,
        artist_id: artistId,
        event_details: eventDetails,
        venue_city_id: venueCityId,
        venue_location: venueLocation,
        event_date: eventDate,
        duration_hours: durationHours,
        total_amount: totalAmount,
        token_amount: tokenAmount,
        remaining_amount: remainingAmount,
        commission_rate_snapshot: commissionRate,
        artist_response_deadline: artistResponseDeadline.toISOString(),
        balance_due_deadline: balanceDueDeadline.toISOString(),
        status: 'requested',
        source: 'platform',
      })
      .select()
      .single();

    if (bookingError) {
      return res.status(500).json({ message: bookingError.message });
    }

    const venueLabel = `${venueCity.name}, ${venueCity.state} — ${venueLocation}`;
    const eventDateLabel = new Date(eventDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const feeLabel = totalAmount.toLocaleString('en-IN');

    await sendBookingRequestMessage({
      to: toWhatsAppRecipient(artist.profile.phone),
      fanName: req.profile.name || 'A fan',
      eventDate: eventDateLabel,
      venue: venueLabel,
      details: eventDetails,
      fee: feeLabel,
      bookingId: booking.id,
    });

    if (artist.profile?.email) {
      await sendMail({
        to: artist.profile.email,
        subject: 'New booking request on Alivestage',
        html: bookingRequestHtml({
          artistName: artist.profile.name,
          fanName: req.profile.name,
          eventDate: eventDateLabel,
          eventDetails,
          venue: venueLabel,
        }),
      });
    }

    res.status(201).json({
      bookingId: booking.id,
      status: 'requested',
      totalAmount,
      tokenAmount,
      artistFee: remainingAmount,
      commissionRate,
    });
  } catch (err) {
    console.error('[bookings/create]', err);
    res.status(500).json({ message: err.message });
  }
});

/** Same backend path as WhatsApp Confirm button */
router.post('/:id/confirm', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const result = await confirmBooking(req.params.id, req.profile);
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ success: true, status: result.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Same backend path as WhatsApp Decline button */
router.post('/:id/decline', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const result = await declineBooking(req.params.id, req.profile);
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ success: true, status: result.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** @deprecated alias — prefer /confirm */
router.post('/:id/accept', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const result = await confirmBooking(req.params.id, req.profile);
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ success: true, status: result.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** @deprecated alias — prefer /decline */
router.post('/:id/reject', requireAuth, requireRole('artist'), async (req, res) => {
  try {
    const result = await declineBooking(req.params.id, req.profile);
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    res.json({ success: true, status: result.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * Fan pays 10% Alivestage commission after artist confirms.
 * Standard Razorpay order only — no Route / transfers.
 */
router.post('/:id/pay-token', requireAuth, requireRole('fan'), async (req, res) => {
  try {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', req.params.id)
      .eq('fan_id', req.profile.id)
      .eq('status', 'awaiting_token')
      .single();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or not awaiting payment' });
    }

    const { mock, order } = await createOrder({
      amount: booking.token_amount,
      receipt: `tk_${booking.id.slice(0, 8)}`,
      notes: { bookingId: booking.id, type: 'token_commission' },
      // Explicitly no Route
      artistLinkedAccountId: null,
      artistShare: 0,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID || '',
      mock: !!mock,
      tokenAmount: booking.token_amount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-token', requireAuth, requireRole('fan'), async (req, res) => {
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
      .eq('status', 'awaiting_token')
      .single();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or not awaiting payment' });
    }

    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('payment_type', 'token')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('payments')
        .update({
          razorpay_order_id,
          razorpay_payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('payments').insert({
        booking_id: bookingId,
        razorpay_order_id,
        razorpay_payment_id,
        amount_captured: booking.token_amount,
        commission_rate_snapshot: booking.commission_rate_snapshot,
        platform_commission: booking.token_amount,
        artist_payout_amount: 0,
        payment_type: 'token',
        status: 'token_paid',
      });
    }

    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .eq('status', 'awaiting_token');

    res.json({ success: true, status: 'confirmed' });
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
        fan:profiles!bookings_fan_id_fkey(id, name, email, phone),
        artist:profiles!bookings_artist_id_fkey(id, name, email, phone),
        venue_city:cities!bookings_venue_city_id_fkey(id, name, state, tier),
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

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        fan:profiles!bookings_fan_id_fkey(id, name, email, phone),
        artist:profiles!bookings_artist_id_fkey(id, name, email, phone),
        venue_city:cities!bookings_venue_city_id_fkey(id, name, state, tier),
        payments(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isArtist = req.profile.role === 'artist' && booking.artist_id === req.profile.id;
    const isFan = req.profile.role === 'fan' && booking.fan_id === req.profile.id;
    const isAdmin = ['admin', 'superadmin'].includes(req.profile.role);
    if (!isArtist && !isFan && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
