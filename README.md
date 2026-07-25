# AliVeStage — Community Jamming

Portfolio community platform for hosting and joining local jams. Built with Next.js, Express, Supabase, and Razorpay (collection-only fees).

## Model

- **Identity:** Email OTP for session login + city/pincode onboarding.
- **Browse:** Public feed and event summaries; `precise_address` only after paid join (server-side serializer).
- **Host create:** ₹200 fee → event published (`created`). Host fee is never refunded on cancel.
- **Join:** ₹50 fee → membership + precise address unlocked.
- **Host cancel:** full ₹50 refund to joiners; soft-delete memberships.
- **Joiner leave:** 50% refund (₹25); soft-delete membership.
- **Attendance:** host marks attended; self-present is informational only.
- **Ratings:** after host marks `completed`; prompts after `end_at` + 36h grace; window 5 days; reputation shown publicly at 10+ ratings.
- **Help:** sidebar Help posts to an optional Discord incoming webhook (`DISCORD_SUPPORT_WEBHOOK_URL`).

## Stack

- Next.js (App Router) + Express API
- Supabase Postgres + storage
- Razorpay orders/refunds (no Route/escrow)

## Setup

1. Copy `.env.example` → `.env.local` and fill Supabase + `JWT_SECRET`.
2. Apply migrations (`supabase/migrations`), including `008_community_schema.sql` (and `009` if you previously had Discord identity columns).
3. Optional: Razorpay keys (otherwise payments run in mock mode).
4. Optional: `DISCORD_SUPPORT_WEBHOOK_URL` for Help requests.
5. `npm install && npm run dev`
6. Promote an admin after first sign-in:

```sql
UPDATE profiles SET role = 'admin', onboarding_complete = true WHERE email = 'your@email.com';
```

## API surface

- `/api/auth` — email OTP, onboarding, public profiles
- `/api/events` — feed, pay-then-create, join, cancel/leave, attendance, complete
- `/api/ratings` — eligible targets + submit
- `/api/support` — Help → Discord webhook
- `/api/admin` — recent events/users (admin role)
