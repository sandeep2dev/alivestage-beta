# Cursor Prompt: AliVeStage Community — Event Hosting & Jamming Flow

Stack: Next.js + Node + Supabase (Postgres), Razorpay for payments. Optional Discord incoming webhook for Help requests only (no Discord identity/OTP).

---

## Context

This is a portfolio backend project — a community jamming platform, not a commercial booking marketplace. Focus on clean state machines, proper access control, and defensible payment/refund logic. Money is pure collection (no payouts, no Razorpay Route/escrow needed).

## Core Entities

**User**
- `id`, `email` (collected, unverified — entry field only; email OTP is for session login)
- `city`, `pincode`
- `reputation_score` (aggregate, nullable until 10+ ratings), `rating_count`
- `onboarding_complete`

**Event**
- `id`, `host_id` (FK → User)
- `title`, `summary`, `description` (rich text)
- `city`, `precise_address` (see access control below)
- `start_at`, `duration_minutes` (used to compute `end_at`)
- `visibility`: `public` (only type for now, but keep the enum for future-proofing)
- `status`: `created` → `live` → `completed` | `cancelled`
- `created_at`

**Payment**
- `id`, `user_id`, `event_id`, `type`: `host_create_fee` (₹200) | `join_fee` (₹50)
- `status`: `paid` | `refunded_full` | `refunded_partial` | `failed`
- `razorpay_payment_id`, `razorpay_order_id`
- `refund_amount` (nullable), `refund_reason`: `host_cancelled` | `joiner_cancelled` | null

**EventMembership**
- `id`, `event_id`, `user_id`
- `payment_id` (FK)
- `joined_at`
- `host_marked_attended`: boolean, default false — **this is the authoritative attendance flag**
- `self_marked_present`: boolean, default false — informational only, never drives attendance truth or ratings eligibility

**Rating**
- `id`, `event_id`, `rater_id`, `ratee_id` (nullable if rating is for the event itself, not a person — decide if you want event-level rating too, or just host + joiner-to-joiner)
- `rating_type`: `host_rating` | `joiner_rating`
- `score` (1-5), `submitted_at`
- Constraint: only insertable if `EventMembership.host_marked_attended = true` for both rater and ratee (where applicable)

## Auth

1. User signs up / signs in with email OTP.
2. Completes onboarding with name, city, pincode.
3. Can browse the feed immediately; host/join go straight to Razorpay.
4. Optional Help from the sidebar posts to `DISCORD_SUPPORT_WEBHOOK_URL` (incoming webhook only — not identity).

## Payment & Refund State Machine

**Host creates event:**
- Charge ₹200 via Razorpay → on success, event status `created`.
- If payment fails, event is not created (don't create a "pending payment" event row — keep this simple).

**User joins event:**
- Charge ₹50 → on success, create `EventMembership` row, event visible with precise address to this user now.
- Payment required to join — no "request then pay" approval step.

**Host cancels event:**
- All `EventMembership` payments → `refunded_full` (100% of ₹50 back).
- Host's ₹200 create fee → NOT refunded.
- Event status → `cancelled`. Notify all joiners via email.

**Joiner cancels their own join:**
- Their payment → `refunded_partial`, `refund_amount = 25` (50%).
- `EventMembership` row removed or soft-deleted (decide based on whether you want to show "cancelled joiners" in host's view — soft-delete recommended for audit trail).

**Event reaches `end_at` with status still `live`/`created`:**
- Host manually marks `completed` (no auto-transition — host must confirm it happened).
- On `completed`, kick off the rating window (see below).

## Access Control on Event Data

- **Not joined**: user sees `city`, `title`, `summary`, `start_at`, `duration`, host name — NOT `precise_address`.
- **Joined (payment confirmed)**: full event object including `precise_address`.
- Implement this as a serializer/view function, not by hiding fields client-side — the API response itself should differ by requester auth state.

## Home Feed

- Query events with `status IN ('created', 'live')`.
- Sort: requester's `city` match first, then everything else (secondary sort by `start_at` ascending).
- Simple two-tier sort, no geo-distance calculation needed for v1.

## Attendance & Rating Flow

1. Event `end_at` passes → cron waits 24-48h grace period, then fires once.
2. For each `EventMembership` where `host_marked_attended = true`, send a rating prompt via email.
3. Rating window open for 3-5 days (configurable constant), then locks — no more submissions accepted after.
4. Ratings write to `Rating` table. Aggregate `reputation_score` recalculated on each new rating (simple running average is fine).
5. `reputation_score` shown publicly on profile only when `rating_count >= 10`. Below that, show "Not enough ratings yet" — but keep tracking count/score internally regardless of the display threshold.
6. No penalty for unrated attendees — absence of rating is just absence of data.

## Build Priorities (suggest this order)

1. Supabase schema + migrations for all entities above.
2. Auth/onboarding flow (email OTP → profile completion with city/pincode).
3. Event CRUD + Razorpay charge-on-create.
4. Join flow + Razorpay charge-on-join + access-control serializer.
5. Cancellation flow (host and joiner paths) with Razorpay refund API calls.
6. Host attendance marking UI/endpoint.
7. Cron job for rating-window trigger + rating submission endpoints.
8. Reputation aggregation + public display threshold logic.
9. Help → Discord support webhook (sidebar).

Keep each piece testable in isolation — this is a portfolio project, so clean separation between payment logic and event state machine logic matters more than shipping speed.
