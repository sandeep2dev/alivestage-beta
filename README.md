# Alivestage Platform

Secure two-sided marketplace connecting fans with live performance artists. Built with Next.js, Supabase, and Razorpay escrow.

## Stack

- **Frontend:** Next.js App Router, CSS Modules, global design tokens
- **Backend:** Node.js Express (`server/`)
- **Database & Storage:** Supabase PostgreSQL + Storage (avatars)
- **Auth:** Email OTP (custom, via Express + SMTP)
- **Payments:** Razorpay Route (fund holds)

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

2. Create a Supabase project, then fill in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (use the **service_role** key, not anon)
   - `JWT_SECRET`
   - SMTP credentials (OTP emails use Nodemailer; leave `SMTP_HOST` empty to log OTP codes in the API console)
   - `DISCORD_SUPPORT_WEBHOOK_URL` (optional; fan Help messages post here, otherwise logged in the API console)

3. Apply database migrations with the Supabase CLI (preferred — do not paste SQL by hand):
   ```bash
   npm install -D supabase
   npx supabase login
   npx supabase init                    # creates config.toml; keeps existing supabase/migrations/
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   `YOUR_PROJECT_REF` is the id in your project URL: `https://YOUR_PROJECT_REF.supabase.co`.

   This applies pending files in `supabase/migrations/` in order (e.g. `001`, then `002`). Supabase tracks what already ran, so re-running `db push` only applies new migrations.

   **Note:** Do not set `SUPABASE_DB` or `SUPABASE_DB_PASSWORD` in `.env.local`. The CLI loads dotenv and those names override `[db]` in `config.toml`, which causes `Missing required field in config: db.port`.

4. Artist avatars use Supabase Storage. Migration `004_avatars_bucket.sql` creates the public `avatars` bucket (included when you `db push`).

5. Promote a user to superadmin (after they sign in once via OTP):
   ```sql
   UPDATE profiles SET role = 'superadmin', onboarding_complete = true WHERE email = 'your@email.com';
   ```

6. Install and run:
   ```bash
   npm install
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - API server: http://localhost:5001

## Database migrations

Migrations live in `supabase/migrations/` and are the source of truth for schema changes.

| Approach | When to use |
|----------|-------------|
| `npx supabase db push` | Normal workflow |
| SQL Editor paste | One-off / emergency only |

When you change the schema later:

1. Add a **new** file, e.g. `supabase/migrations/003_add_something.sql`  
   (do not edit old migrations that already ran in production)
2. Push it:
   ```bash
   npx supabase db push
   ```

You only need to run this when there are new migration files — not for every app code change.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + Express concurrently |
| `npm run build` | Build Next.js for production |
| `node scripts/test-integration.js` | Run smoke tests |
| `npx supabase db push` | Apply pending migrations to the linked Supabase project |

## User Roles

| Role | Capabilities |
|------|-------------|
| Fan | Browse artists, book gigs, pay token/balance, mark complete |
| Artist | Onboard portfolio, accept/reject bookings |
| Admin | Read-only system audit |
| Superadmin | Refunds, payouts, commission settings |

## Project Structure

See TRD §6 for full directory layout.
