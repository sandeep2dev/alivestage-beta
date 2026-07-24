# AliVeStage — Community Jamming

Portfolio community platform for hosting and joining local jams. Built with Next.js, Express, Supabase, Razorpay (collection-only fees), and Discord OTP identity.

## Model

- **Identity:** Email OTP for session login; Discord OTP (guild member DM) locks `discord_id` and sets `verified_at`.
- **Host create:** ₹200 fee → event published (`created`). Host fee is never refunded on cancel.
- **Join:** ₹50 fee → membership + precise address unlocked (server-side serializer ACL).
- **Host cancel:** full ₹50 refund to joiners; soft-delete memberships.
- **Joiner leave:** 50% refund (₹25); soft-delete membership.
- **Attendance:** host marks attended; self-present is informational only.
- **Ratings:** after host marks `completed`; prompts after `end_at` + 36h grace; window 5 days; reputation shown publicly at 10+ ratings.

## Stack

- Next.js (App Router) + Express API
- Supabase Postgres + storage
- Razorpay orders/refunds (no Route/escrow)
- Discord bot (`discord.js`) for verification DMs

## Setup

1. Copy `.env.example` → `.env.local` and fill Supabase + `JWT_SECRET`.
2. Apply migrations (`supabase/migrations`), including `008_community_schema.sql`.
3. Optional: set `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_INVITE_URL` (otherwise Discord OTP is mocked to the API console).
4. Optional: Razorpay keys (otherwise payments run in mock mode).
5. `npm install && npm run dev`
6. Promote an admin after first sign-in:

```sql
UPDATE profiles SET role = 'admin', onboarding_complete = true WHERE email = 'your@email.com';
```

## API surface

- `/api/auth` — email OTP, onboarding, Discord verify, public profiles
- `/api/events` — feed, CRUD via pay-then-create, join, cancel/leave, attendance, complete
- `/api/ratings` — eligible targets + submit
- `/api/admin` — recent events/users (admin role)
