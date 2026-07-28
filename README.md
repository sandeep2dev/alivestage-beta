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
- Supabase Postgres + storage (avatars)
- Razorpay orders/refunds + optional webhooks (no Route/escrow)

## Setup

1. Copy `.env.example` → `.env.local` and fill Supabase + `JWT_SECRET`.
2. Apply migrations (`supabase/migrations`), including `008_community_schema.sql`, `009` (if needed), and `010_hardening.sql` (OTP/pending orders, cities, soft-ban).
3. Optional: Razorpay keys (otherwise payments run in mock mode).
4. Optional: `RAZORPAY_WEBHOOK_SECRET` and point Razorpay to `POST {SERVER}/api/webhooks/razorpay` for `payment.captured`.
5. Optional: `DISCORD_SUPPORT_WEBHOOK_URL` for Help requests.
6. `npm install && npm run dev`
7. Promote an admin after first sign-in:

```sql
UPDATE profiles SET role = 'admin', onboarding_complete = true WHERE email = 'your@email.com';
```

## Demo seed data

Populate hosts, fans, and past/live/upcoming jams with joiners:

```bash
npm run seed:demo
```

Uses `@yopmail.com` addresses (see script output). Re-running clears previous seed events tagged `[seed-demo]` and recreates them. Sign in via `/auth` OTP; if SMTP is unset, the code is printed in the API console.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next (3000) + Express (5001) |
| `npm run build` / `npm start` | Production Next frontend |
| `npm run start:server` | Production Express API |
| `npm test` | Smoke tests (payment signatures + address ACL) |

## API surface

- `/api/auth` — email OTP, onboarding, profile, avatar upload, public profiles
- `/api/events` — feed, pay-then-create, join, edit, cancel/leave, attendance, complete
- `/api/ratings` — eligible targets + submit
- `/api/cities` — city autocomplete
- `/api/support` — Help → Discord webhook
- `/api/admin` — events/users, force-cancel, promote/demote, soft-ban
- `/api/webhooks/razorpay` — payment.captured fulfillment

## Deploy

The app is two processes: **Next.js** (UI) and **Express** (API). They share `.env` values for Supabase, JWT, and Razorpay.

### Suggested layout

1. **Frontend (Vercel)**  
   - Root directory: repo root  
   - Build: `npm run build`  
   - Output: Next default  
   - Env: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SERVER_URL` (public API URL)

2. **API (Railway / Render / Fly)**  
   - Start: `npm run start:server`  
   - Env: `PORT`, `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, Razorpay + SMTP as needed  
   - Health check: `GET /health`

3. **Database**  
   - Hosted Supabase project; push migrations with `npx supabase db push` (do not set `SUPABASE_DB` / `SUPABASE_DB_PASSWORD` locally if that breaks the CLI).

4. **Razorpay webhooks**  
   - URL: `https://<api-host>/api/webhooks/razorpay`  
   - Events: `payment.captured` (and optionally `payment.authorized`)  
   - Set `RAZORPAY_WEBHOOK_SECRET` to the dashboard signing secret.

CORS is locked to `NEXT_PUBLIC_APP_URL`, so the frontend origin must match that value in production.
