# Alivestage production deploy runbook

**Target layout:** Vercel (Next.js) + Railway (Express API) + Supabase (DB + storage) + Razorpay + SMTP

**Example domains used below:**
- Frontend: `https://alivestage.com`
- API: `https://api.alivestage.com`

Replace with your real domain/subdomain.

---

## Phase 0 — Prerequisites

Before you start, have ready:

- [ ] GitHub repo connected (this project)
- [ ] Domain DNS access (GoDaddy / Cloudflare / etc.)
- [ ] Razorpay account with **live** keys enabled
- [ ] SMTP credentials (GoDaddy mailbox or Resend/SES)
- [ ] Supabase account
- [ ] Vercel + Railway accounts (both can sign in with GitHub)

**Generate a JWT secret now** (save it somewhere safe):

```bash
openssl rand -base64 48
```

You'll use this as `JWT_SECRET` in production.

---

## Phase 1 — Supabase (database + storage)

### 1.1 Create production project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Pick a region close to India (e.g. **Mumbai / Singapore**)
3. Set a strong DB password and save it
4. Wait for the project to finish provisioning

### 1.2 Link CLI and push migrations

From your repo root:

```bash
cd /Volumes/DevDisk/Workspace/alivestage-beta

# Install CLI if needed (already in devDependencies)
npx supabase login

# Link to the new prod project (pick project ref from dashboard URL)
npx supabase link --project-ref YOUR_PROJECT_REF
```

Push all migrations:

```bash
npx supabase db push
```

This creates tables, cities data, storage buckets (`avatars`, `event-images`), OTP tables, etc.

> **Important:** Do **not** set `SUPABASE_DB` or `SUPABASE_DB_PASSWORD` in `.env.local` — the README notes those can break `db push`.

### 1.3 Collect Supabase credentials

From **Project Settings → API**:

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**secret — API only**) |

### 1.4 Verify storage buckets

In **Storage**, confirm buckets exist:
- `avatars` (public)
- `event-images` (public)

If missing, re-run `npx supabase db push` or apply migrations `004` and `011` manually.

---

## Phase 2 — Deploy the API (Railway)

Deploy the API **before** the frontend so you have a stable `NEXT_PUBLIC_SERVER_URL`.

### 2.1 Create Railway service (API only)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `alivestage-beta`
3. Name the service **`alivestage-api`** (helps avoid mixing it up with the frontend)

Railway often auto-detects **Next.js** and runs `next start`. That is wrong for this service — you need **Express only**.

| Setting | Value |
|---------|--------|
| **Start command** | `npm run start:server` |
| **Build command** | `npm ci` (install only — do **not** run `next build` here) |
| **Root directory** | `/` (repo root) |

**Verify in deploy logs after first deploy.** You must see:

```
[server] Alivestage community API listening on port ...
[cron] Registered hourly rating-prompt jobs
```

If you see `next start` or `Ready on http://localhost:3000`, the start command is wrong — fix it under **Settings → Deploy → Custom Start Command**, redeploy, and check logs again.

> **Two services, same repo:** If you also host the frontend on Railway, create a **second** service with start command `npm run build && npm start`. Never attach `api.alivestage.com` to the Next.js service.

### 2.2 Set environment variables (Railway)

In **Variables**, add:

```env
# Core
PORT=5001
NODE_ENV=production
JWT_SECRET=<your-openssl-secret>

# URLs (must match real prod domains)
NEXT_PUBLIC_APP_URL=https://alivestage.com
NEXT_PUBLIC_SERVER_URL=https://api.alivestage.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# Razorpay LIVE keys (not test keys in prod)
RAZORPAY_LIVE_KEY_ID=rzp_live_xxxx
RAZORPAY_LIVE_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=          # fill after Phase 5

# Email (pick one provider)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=abc@alivestage.com
SMTP_PASS=your-mailbox-password
EMAIL_FROM=sandeep@alivestage.com

# Optional — Discord ops feeds
DISCORD_SUPPORT_WEBHOOK_URL=
DISCORD_SIGNUP_WEBHOOK_URL=
DISCORD_EVENT_CREATED_WEBHOOK_URL=
DISCORD_EVENT_JOINED_WEBHOOK_URL=
DISCORD_REFUND_WEBHOOK_URL=
```

**How Razorpay mode works in your code:** when `NEXT_PUBLIC_APP_URL` is **not** localhost, the server uses `RAZORPAY_LIVE_KEY_ID/SECRET` (or falls back to `RAZORPAY_KEY_ID/SECRET`).

### 2.3 Health check

In Railway service settings:
- **Health check path:** `/health`
- Expected response: `{ "status": "ok", "service": "alivestage-server" }`

### 2.4 Assign custom domain

1. Railway → your service → **Settings → Networking → Custom Domain**
2. Add `api.alivestage.com`
3. Railway gives you a CNAME target (e.g. `something.up.railway.app`)

In your DNS provider:

```
Type: CNAME
Name: api
Value: <railway-provided-host>
TTL: Auto / 300
```

Wait for SSL (usually a few minutes).

### 2.5 Smoke-test API

```bash
curl https://api.alivestage.com/health
```

Expected:

```json
{"status":"ok","service":"alivestage-server"}
```

Check Railway logs — you should **not** see:
- `JWT_SECRET is not set`
- `Razorpay: MOCK`

---

## Phase 3 — Deploy the frontend (Vercel)

### 3.1 Import project

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import the same GitHub repo
3. Framework: **Next.js** (auto-detected)

| Setting | Value |
|---------|--------|
| **Build command** | `npm run build` |
| **Output** | Next.js default |
| **Install command** | `npm ci` |
| **Root directory** | `/` |

### 3.2 Environment variables (Vercel)

Add these for **Production**:

```env
NEXT_PUBLIC_APP_URL=https://alivestage.com
NEXT_PUBLIC_SERVER_URL=https://api.alivestage.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co
```

> These are baked in at **build time**. If you change them later, **redeploy** the frontend.

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` or `JWT_SECRET` on Vercel — the browser never talks to Supabase directly for auth; everything goes through Express.

### 3.3 Custom domain

1. Vercel → Project → **Settings → Domains**
2. Add `alivestage.com` and `www.alivestage.com`
3. Follow Vercel DNS instructions:

**If using Vercel nameservers:** point domain NS to Vercel.

**If keeping GoDaddy DNS:**

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Deploy and confirm `https://alivestage.com` loads.

---

## Phase 4 — Wire CORS and URLs

The API allows `NEXT_PUBLIC_APP_URL` **and its www / non-www twin** (e.g. both `https://alivestage.com` and `https://www.alivestage.com`). Startup logs list the exact origins: `[server] CORS allowed origins: ...`

**Important:** Vercel often redirects `alivestage.com` → `www.alivestage.com`. If users land on `www`, the browser sends `Origin: https://www.alivestage.com`. A single-origin CORS config would block that even when env vars “look the same” on paper.

Optional extra origins (preview deploys, staging):

```env
CORS_ALLOWED_ORIGINS=https://staging.alivestage.com
```

**Both services must agree on URLs:**

| Variable | Railway (API) | Vercel (frontend) |
|----------|---------------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://alivestage.com` | `https://alivestage.com` |
| `NEXT_PUBLIC_SERVER_URL` | `https://api.alivestage.com` | `https://api.alivestage.com` |

Rules:
- No trailing slash
- Use `https://`
- Pick one canonical URL for links/emails; CORS accepts both www and non-www automatically

After any URL change: **redeploy both** Railway and Vercel.

---

## Phase 5 — Razorpay webhooks

### 5.1 Create webhook in Razorpay Dashboard

1. [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings → Webhooks**
2. **Add New Webhook**

| Field | Value |
|-------|--------|
| **URL** | `https://api.alivestage.com/api/webhooks/razorpay` |
| **Events** | `payment.captured` (also handles `payment.authorized`) |
| **Secret** | Generate and copy |

### 5.2 Add secret to Railway

```env
RAZORPAY_WEBHOOK_SECRET=<webhook-signing-secret>
```

Redeploy / restart the API service.

### 5.3 Test webhook delivery

In Razorpay → Webhooks → your webhook → **Send test event** (or do a small live payment).

Railway logs should show fulfillment, not `Invalid webhook signature`.

---

## Phase 6 — Email (OTP + notifications)

> **Railway Hobby/Free blocks outbound SMTP** (ports 587, 465, 25). GoDaddy SMTP works on localhost but fails in production with `ETIMEDOUT` / `CONN`. Use **Resend API** on Railway; keep GoDaddy SMTP for local dev only.

Priority in code: `RESEND_API_KEY` → SMTP → console mock.

### Option A — Resend API (recommended for production)

1. Sign up at [resend.com](https://resend.com)
2. **Domains** → add `alivestage.com` → add the DNS records Resend gives you (GoDaddy DNS)
3. Wait for domain verification (usually a few minutes)
4. **API Keys** → create key → add to **Railway only**:

```env
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=sandeep@alivestage.com
```

Do **not** set `SMTP_*` on Railway when using Resend (avoids accidental SMTP attempts).

Redeploy the API service and test OTP.

### Option B — GoDaddy SMTP (local dev only)

```env
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@alivestage.com
SMTP_PASS=mailbox-password
EMAIL_FROM=sandeep@alivestage.com
```

### Option C — GoDaddy SMTP on Railway (not recommended)

Requires **Railway Pro** plan + redeploy. GoDaddy may still block datacenter IPs even when ports are open. Prefer Resend.

### Test OTP

1. Open `https://www.alivestage.com/auth`
2. Enter your email → request OTP
3. Confirm email arrives (not spam)
4. If no provider is configured, OTP only appears in Railway logs (mock mode)

---

## Phase 7 — Discord (optional but useful)

Create incoming webhooks in your Discord server, then set on Railway:

```env
DISCORD_SUPPORT_WEBHOOK_URL=       # Help dialog
DISCORD_SIGNUP_WEBHOOK_URL=
DISCORD_EVENT_CREATED_WEBHOOK_URL=
DISCORD_EVENT_JOINED_WEBHOOK_URL=
DISCORD_REFUND_WEBHOOK_URL=
```

Leave empty to log to Railway console instead.

---

## Phase 8 — First admin user

### 8.1 Sign up via the app

1. Go to `https://alivestage.com/auth`
2. Complete OTP login + onboarding

### 8.2 Promote to admin in Supabase

**SQL Editor** in Supabase:

```sql
UPDATE profiles
SET role = 'admin', onboarding_complete = true
WHERE email = 'your@email.com';
```

Sign out and back in. Visit `https://alivestage.com/admin`.

---

## Phase 9 — Production verification checklist

Run through this in order:

### Auth
- [ ] Request OTP → email received
- [ ] Login succeeds, token stored
- [ ] Onboarding saves city/pincode
- [ ] Avatar upload works (Supabase `avatars` bucket)

### Events
- [ ] Browse `/events` — feed loads
- [ ] Create event → Razorpay ₹50 checkout opens (live mode)
- [ ] After payment → event appears as `created`
- [ ] Join event → ₹10 checkout → precise address unlocked
- [ ] Join confirmation email received

### Payments / webhooks
- [ ] Razorpay webhook shows 200 in dashboard
- [ ] `payments` row created in Supabase after join/create
- [ ] Host cancel → joiners notified, no refund
- [ ] Joiner leave → no refund

### Content
- [ ] Rich text + image upload in event description
- [ ] Leaflet venue picker saves coordinates
- [ ] Google Maps link works on event page

### Ratings / cron
- [ ] Mark event completed + attendance
- [ ] After grace period, rating prompt emails send (hourly cron)
- [ ] `/events/[id]/rate` works within 5-day window

### Admin
- [ ] `/admin` accessible for admin role
- [ ] Force-cancel, soft-ban work

### Ops
- [ ] `GET https://api.alivestage.com/health` → 200
- [ ] Help dialog posts to Discord (if configured)
- [ ] CI green on `main`: `npm test`

---

## Phase 10 — Ongoing ops

### Deploy updates

| Change | Action |
|--------|--------|
| Frontend only | Push to `main` → Vercel auto-deploys |
| API only | Push to `main` → Railway auto-deploys |
| DB schema | `npx supabase db push` against prod project |
| Env var change | Update in Railway/Vercel → redeploy |

### Uptime monitoring (free tier options)

- [UptimeRobot](https://uptimerobot.com) → monitor `https://api.alivestage.com/health` every 5 min
- Optional: also monitor `https://alivestage.com`

### Logs to watch

- **Railway:** Razorpay webhook errors, SMTP failures, cron `[cron] Rating prompt job failed`
- **Razorpay dashboard:** failed webhooks, refund status
- **Supabase:** slow queries, storage usage

### Backups

Supabase Pro includes automated backups. On free tier, consider periodic `pg_dump` or upgrade before real traffic.

---

## Troubleshooting

### `/health` returns Next.js HTML 404 instead of JSON

**Symptom:** `curl https://api.alivestage.com/health` returns a full webpage (`x-powered-by: Next.js`) instead of:

```json
{"status":"ok","service":"alivestage-server"}
```

**Cause:** `api.alivestage.com` is attached to a Railway service running **Next.js** (`next start`), not Express (`npm run start:server`).

**Fix (Railway dashboard):**

1. Open your Railway project — list all services.
2. Open each service → **Deployments → View logs** and find which one prints `Alivestage community API listening` vs `next start`.
3. On the **Next.js** service: **Settings → Networking → Custom Domains** → **remove** `api.alivestage.com`.
4. On the **API** service:
   - **Settings → Deploy → Custom Start Command** → `npm run start:server`
   - **Settings → Networking → Custom Domains** → add `api.alivestage.com`
   - Copy the new `*.up.railway.app` hostname Railway shows for that service
5. In GoDaddy/DNS: update the `api` CNAME to point at the **API service’s** Railway hostname (not the frontend’s).
6. Redeploy the API service and wait 2–5 minutes for DNS/SSL.

**Verify:**

```bash
curl -s https://api.alivestage.com/health
# → {"status":"ok","service":"alivestage-server"}

curl -sI https://api.alivestage.com/health | grep -i x-powered-by
# → (no output — Express does not set x-powered-by: Next.js)
```

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `/health` shows Next.js 404 page | `api.*` domain on wrong Railway service | See section above |
| API calls fail from browser (CORS) | Browser on `www.*` but API only allowed bare domain | Redeploy API (auto www twin) or set `NEXT_PUBLIC_APP_URL=https://www.alivestage.com` on Railway + Vercel |
| API calls fail from browser | Wrong `NEXT_PUBLIC_SERVER_URL` | Match URLs on both services, redeploy frontend |
| Razorpay modal doesn't open | Mock mode / wrong keys | Set live keys; ensure `NEXT_PUBLIC_APP_URL` is not localhost |
| Payment succeeds but join/create not fulfilled | Webhook misconfigured | Check URL, secret, Railway logs |
| OTP never arrives / `ETIMEDOUT` on SMTP | Railway blocks SMTP on Hobby; GoDaddy unreachable from cloud | Use `RESEND_API_KEY` on Railway (see Phase 6) |
| OTP never arrives | SMTP misconfigured | Fix SMTP vars locally; use Resend in prod |
| Event images broken in UI | Missing `NEXT_PUBLIC_SUPABASE_URL` on Vercel | Add var + **redeploy** frontend |
| Admin page blocked | Role not promoted | Run SQL `UPDATE profiles SET role = 'admin'` |
| Rating emails not sent | Cron only runs on API server | Ensure Railway service is always-on (not sleeping) |

---

## Cost estimate (early stage)

| Service | Typical cost |
|---------|--------------|
| Vercel (Hobby) | Free |
| Railway (Hobby) | ~$5/mo credit, then usage-based |
| Supabase (Free) | Free up to limits; upgrade ~$25/mo when needed |
| Razorpay | Per-transaction fees only |
| Domain | ~$10–15/yr |
| Email (Resend free tier) | Free up to 3k/mo |

---

## Optional next steps

1. **GitHub Actions deploy** — auto-deploy Railway/Vercel on merge to `main`
2. **`railway.json` / `vercel.json`** — codify start command and env in repo
3. **Staging environment** — second Supabase project + `staging.alivestage.com` + Razorpay test keys
4. **Resend** — swap SMTP before launch for better OTP inbox placement

If you want, I can add deploy config files to the repo (`railway.toml`, Vercel settings notes, or a GitHub Actions deploy workflow) so this is repeatable with one push.