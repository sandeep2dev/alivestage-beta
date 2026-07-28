/**
 * Seed demo hosts, fans, and events (past / live / upcoming) with joiners.
 *
 * Usage: npm run seed:demo
 *
 * Sign in via email OTP using any of the printed @yopmail.com addresses
 * (check https://yopmail.com for the inbox, or use console OTP mock if SMTP is unset).
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const {
  HOST_CREATE_FEE,
  JOIN_FEE,
} = require('../server/config/community');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_TAG = 'seed-demo';

const HOSTS = [
  { email: 'as.host.pune@yopmail.com', name: 'Aarav Mehta', city: 'Pune', pincode: '411001' },
  { email: 'as.host.mumbai@yopmail.com', name: 'Diya Sharma', city: 'Mumbai', pincode: '400001' },
  { email: 'as.host.blr@yopmail.com', name: 'Kabir Rao', city: 'Bengaluru', pincode: '560001' },
];

const FANS = [
  { email: 'as.fan.riya@yopmail.com', name: 'Riya Kapoor', city: 'Pune', pincode: '411004' },
  { email: 'as.fan.ishaan@yopmail.com', name: 'Ishaan Patel', city: 'Pune', pincode: '411007' },
  { email: 'as.fan.meera@yopmail.com', name: 'Meera Nair', city: 'Mumbai', pincode: '400050' },
  { email: 'as.fan.arjun@yopmail.com', name: 'Arjun Desai', city: 'Mumbai', pincode: '400013' },
  { email: 'as.fan.sara@yopmail.com', name: 'Sara Khan', city: 'Bengaluru', pincode: '560038' },
  { email: 'as.fan.vikram@yopmail.com', name: 'Vikram Iyer', city: 'Bengaluru', pincode: '560095' },
  { email: 'as.fan.ananya@yopmail.com', name: 'Ananya Joshi', city: 'Pune', pincode: '411014' },
  { email: 'as.fan.rohan@yopmail.com', name: 'Rohan Gupta', city: 'Delhi', pincode: '110001' },
  { email: 'as.fan.neha@yopmail.com', name: 'Neha Verma', city: 'Jaipur', pincode: '302001' },
  { email: 'as.fan.karan@yopmail.com', name: 'Karan Singh', city: 'Hyderabad', pincode: '500001' },
];

function hoursFromNow(h) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

function mockOrderId(prefix) {
  return `seed_${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function mockPayId() {
  return `seed_pay_${Math.random().toString(36).slice(2, 12)}`;
}

function pickJoiners(fans, count, excludeIds = new Set()) {
  const pool = fans.filter((f) => !excludeIds.has(f.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

async function upsertProfile(row) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', row.email)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: row.name,
        city: row.city,
        pincode: row.pincode,
        onboarding_complete: true,
        role: row.role || 'member',
      })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      email: row.email,
      name: row.name,
      city: row.city,
      pincode: row.pincode,
      onboarding_complete: true,
      role: row.role || 'member',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function clearPreviousSeedEvents(hostIds) {
  if (!hostIds.length) return;

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .in('host_id', hostIds)
    .ilike('description', `%[${SEED_TAG}]%`);

  const ids = (events || []).map((e) => e.id);
  if (!ids.length) return;

  await supabase.from('ratings').delete().in('event_id', ids);
  await supabase.from('event_memberships').delete().in('event_id', ids);
  await supabase.from('payments').delete().in('event_id', ids);
  await supabase.from('events').delete().in('id', ids);
  console.log(`Cleared ${ids.length} previous seed events`);
}

async function createEventWithHostFee({ host, title, summary, description, city, address, startAt, durationMinutes, status }) {
  const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
  const completed =
    status === 'completed'
      ? {
          completed_at: endAt.toISOString(),
          rating_window_closes_at: new Date(endAt.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : {};

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      host_id: host.id,
      title,
      summary,
      description: `${description}\n\n[${SEED_TAG}]`,
      city,
      precise_address: address,
      start_at: startAt.toISOString(),
      duration_minutes: durationMinutes,
      end_at: endAt.toISOString(),
      visibility: 'public',
      status,
      ...completed,
    })
    .select('*')
    .single();
  if (error) throw error;

  const { error: payErr } = await supabase.from('payments').insert({
    user_id: host.id,
    event_id: event.id,
    type: 'host_create_fee',
    status: 'paid',
    amount: HOST_CREATE_FEE,
    razorpay_order_id: mockOrderId('host'),
    razorpay_payment_id: mockPayId(),
  });
  if (payErr) throw payErr;

  return event;
}

async function addJoiners(event, joiners, { markAttended = false } = {}) {
  for (const fan of joiners) {
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        user_id: fan.id,
        event_id: event.id,
        type: 'join_fee',
        status: 'paid',
        amount: JOIN_FEE,
        razorpay_order_id: mockOrderId('join'),
        razorpay_payment_id: mockPayId(),
      })
      .select('*')
      .single();
    if (payErr) throw payErr;

    const { error: memErr } = await supabase.from('event_memberships').insert({
      event_id: event.id,
      user_id: fan.id,
      payment_id: payment.id,
      host_marked_attended: markAttended,
      self_marked_present: markAttended && Math.random() > 0.4,
    });
    if (memErr) throw memErr;
  }
}

async function main() {
  console.log('Seeding demo data…');

  const hosts = [];
  for (const h of HOSTS) {
    hosts.push(await upsertProfile(h));
  }
  const fans = [];
  for (const f of FANS) {
    fans.push(await upsertProfile(f));
  }

  await clearPreviousSeedEvents(hosts.map((h) => h.id));

  const catalog = [
    // Past (completed)
    {
      host: hosts[0],
      title: 'Acoustic Sunday (Past)',
      summary: 'Chill acoustic circle that already wrapped up.',
      description: 'Completed past jam for ratings / history demos.',
      city: 'Pune',
      address: '12 Lane 3, Koregaon Park, Pune',
      startAt: daysFromNow(-10),
      durationMinutes: 120,
      status: 'completed',
      joinerCount: 4,
      markAttended: true,
      bucket: 'past',
    },
    {
      host: hosts[1],
      title: 'Midnight Blues Night (Past)',
      summary: 'Late-night blues jam from last week.',
      description: 'Past completed event in Mumbai.',
      city: 'Mumbai',
      address: 'Studio 4, Bandra West, Mumbai',
      startAt: daysFromNow(-5),
      durationMinutes: 150,
      status: 'completed',
      joinerCount: 3,
      markAttended: true,
      bucket: 'past',
    },
    // Past but host never marked complete (joiners should see Past)
    {
      host: hosts[2],
      title: 'Open Mic Leftover (Past, uncompleted)',
      summary: 'Ended yesterday — host never marked complete.',
      description: 'Tests Past display for joiners without completed status.',
      city: 'Bengaluru',
      address: 'Indiranagar Music Room, Bengaluru',
      startAt: hoursFromNow(-30),
      durationMinutes: 120,
      status: 'created',
      joinerCount: 3,
      markAttended: false,
      bucket: 'past',
    },
    // Live now (started, not ended)
    {
      host: hosts[0],
      title: 'Live Right Now — Pune Circle',
      summary: 'Happening now in Pune. Drop in if you are nearby.',
      description: 'Currently live based on start/end window.',
      city: 'Pune',
      address: 'Baner Jam Loft, Pune',
      startAt: hoursFromNow(-1),
      durationMinutes: 180,
      status: 'created',
      joinerCount: 5,
      markAttended: false,
      bucket: 'live',
    },
    {
      host: hosts[1],
      title: 'Live Right Now — Mumbai Keys',
      summary: 'Keyboard + vocals session in progress.',
      description: 'Second live jam overlapping now.',
      city: 'Mumbai',
      address: 'Andheri Music Hub, Mumbai',
      startAt: hoursFromNow(-0.5),
      durationMinutes: 150,
      status: 'live',
      joinerCount: 4,
      markAttended: false,
      bucket: 'live',
    },
    {
      host: hosts[2],
      title: 'Live Right Now — Blr Garage',
      summary: 'Garage rock warm-up currently on.',
      description: 'Bengaluru live jam.',
      city: 'Bengaluru',
      address: 'Koramangala Garage, Bengaluru',
      startAt: hoursFromNow(-2),
      durationMinutes: 240,
      status: 'created',
      joinerCount: 3,
      markAttended: false,
      bucket: 'live',
    },
    // Upcoming / future
    {
      host: hosts[0],
      title: 'Friday Folk Gathering',
      summary: 'Upcoming folk night — join to unlock address.',
      description: 'Future jam in Pune.',
      city: 'Pune',
      address: 'Kothrud Community Hall, Pune',
      startAt: daysFromNow(3),
      durationMinutes: 120,
      status: 'created',
      joinerCount: 4,
      markAttended: false,
      bucket: 'upcoming',
    },
    {
      host: hosts[1],
      title: 'Weekend Fusion Jam',
      summary: 'Jazz meets indie — next weekend in Mumbai.',
      description: 'Future fusion jam.',
      city: 'Mumbai',
      address: 'Lower Parel Loft, Mumbai',
      startAt: daysFromNow(6),
      durationMinutes: 180,
      status: 'created',
      joinerCount: 2,
      markAttended: false,
      bucket: 'upcoming',
    },
    {
      host: hosts[2],
      title: 'Beginner Guitar Circle',
      summary: 'Friendly beginner session next Thursday.',
      description: 'Future beginner jam in Bengaluru.',
      city: 'Bengaluru',
      address: 'Jayanagar Practice Room, Bengaluru',
      startAt: daysFromNow(4),
      durationMinutes: 90,
      status: 'created',
      joinerCount: 5,
      markAttended: false,
      bucket: 'upcoming',
    },
    {
      host: hosts[0],
      title: 'Late Night Synth Lab',
      summary: 'Electronic / synth explorers only.',
      description: 'Far-future jam to fill the feed.',
      city: 'Pune',
      address: 'Hinjewadi Creative Space, Pune',
      startAt: daysFromNow(12),
      durationMinutes: 150,
      status: 'created',
      joinerCount: 1,
      markAttended: false,
      bucket: 'upcoming',
    },
  ];

  const summary = { past: 0, live: 0, upcoming: 0, joiners: 0 };

  for (const item of catalog) {
    const event = await createEventWithHostFee(item);
    const joiners = pickJoiners(fans, item.joinerCount, new Set([item.host.id]));
    await addJoiners(event, joiners, { markAttended: item.markAttended });
    summary[item.bucket] += 1;
    summary.joiners += joiners.length;
    console.log(
      `+ ${item.bucket.padEnd(8)} ${event.title} (${joiners.length} joiners)`
    );
  }

  console.log('\nDone.');
  console.log(
    `Events: ${summary.past} past, ${summary.live} live, ${summary.upcoming} upcoming · ${summary.joiners} memberships`
  );
  console.log('\nHost logins (yopmail):');
  for (const h of HOSTS) console.log(`  ${h.email}  —  ${h.name} (${h.city})`);
  console.log('\nFan logins (yopmail):');
  for (const f of FANS) console.log(`  ${f.email}  —  ${f.name} (${f.city})`);
  console.log('\nOpen https://yopmail.com and enter the address to read OTP emails (or check API console if SMTP is unset).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
