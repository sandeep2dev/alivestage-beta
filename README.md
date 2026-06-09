# Alivestage Platform

Secure two-sided marketplace connecting fans with live performance artists. Built with Next.js, Supabase, and Razorpay escrow.

## Stack

- **Frontend:** Next.js App Router, CSS Modules, global design tokens
- **Backend:** Node.js Express (`server/`)
- **Database & Auth:** Supabase PostgreSQL + Email OTP
- **Payments:** Razorpay Route (fund holds)

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

2. Create a Supabase project and run the migration:
   ```bash
   # Apply supabase/migrations/001_initial_schema.sql in Supabase SQL editor
   ```

3. Create a public `avatars` storage bucket in Supabase.

4. Promote a user to superadmin:
   ```sql
   UPDATE profiles SET role = 'superadmin', onboarding_complete = true WHERE email = 'your@email.com';
   ```

5. Install and run:
   ```bash
   npm install
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - API server: http://localhost:5001

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + Express concurrently |
| `npm run build` | Build Next.js for production |
| `node scripts/test-integration.js` | Run smoke tests |

## User Roles

| Role | Capabilities |
|------|-------------|
| Fan | Browse artists, book gigs, pay token/balance, mark complete |
| Artist | Onboard portfolio, accept/reject bookings |
| Admin | Read-only system audit |
| Superadmin | Refunds, payouts, commission settings |

## Project Structure

See TRD §6 for full directory layout.
