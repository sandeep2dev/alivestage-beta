# WhatsApp Cloud API — templates to approve in Meta Business Manager

Submit these in **WhatsApp Manager → Message templates**. Language: **English (`en`)**.  
Until credentials + templates are live, the API logs messages to the server console (mock mode).

Button payload IDs used by our webhook (must match template button payloads if Meta lets you set them):

- Confirm → `booking_confirm:{{booking_uuid}}` (or configure as quick-reply with dynamic body; see note below)
- Decline → `booking_decline:{{booking_uuid}}`

> **Note on buttons:** Meta’s template UX varies. Prefer a template with **2 quick-reply buttons** (Confirm / Decline) whose payloads include the booking id, plus a **URL button** “View details” pointing at  
> `{{1}}` = path suffix `dashboard/bookings/<uuid>` under your app domain  
> Full URL example: `https://your-domain.com/dashboard/bookings/<uuid>`

If Meta only allows static quick-reply titles (Confirm / Decline) without dynamic payloads, we can fall back to an interactive message after the user replies in-session, or encode the booking id in a short URL. Flag this back if template approval rejects dynamic button payloads.

---

## 1. `alivestage_whatsapp_otp`

**Category:** Authentication (or Utility)  
**Name:** `alivestage_whatsapp_otp`

**Body:**
```
Your Alivestage verification code is {{1}}. It expires in 10 minutes. Do not share this code.
```

**Variables:**
| Index | Example |
|-------|---------|
| {{1}} | 482913 |

---

## 2. `alivestage_booking_request`

**Category:** Utility / Business  
**Name:** `alivestage_booking_request`

**Body:**
```
New booking request from {{1}}.
Date: {{2}}
Venue: {{3}}
Details: {{4}}
Fee: ₹{{5}}
Reply to confirm or decline.
```

**Variables (examples):**
| Index | Example |
|-------|---------|
| {{1}} | Priya Sharma |
| {{2}} | 12 Aug 2026, 7:00 pm |
| {{3}} | Mumbai, Maharashtra — Taj Lands End |
| {{4}} | Wedding reception, acoustic set |
| {{5}} | 25,000 |

**Buttons:**
1. Quick reply — **Confirm** (payload ideally `booking_confirm:<booking_id>`)
2. Quick reply — **Decline** (payload ideally `booking_decline:<booking_id>`)
3. URL — **View details** → `https://YOUR_APP_DOMAIN/{{1}}`  
   Dynamic suffix example: `dashboard/bookings/550e8400-e29b-41d4-a716-446655440000`

---

## 3. `alivestage_pay_token`

**Category:** Utility  
**Name:** `alivestage_pay_token`

**Body:**
```
{{1}} confirmed your booking for {{2}}. Pay ₹{{3}} (10% Alivestage fee) to lock it in: {{4}}
```

**Variables (examples):**
| Index | Example |
|-------|---------|
| {{1}} | Arijit Live |
| {{2}} | 12 Aug 2026, 7:00 pm |
| {{3}} | 2,500 |
| {{4}} | https://YOUR_APP_DOMAIN/my-bookings?pay=<booking_id> |

---

## 4. `alivestage_booking_declined`

**Category:** Utility  
**Name:** `alivestage_booking_declined`

**Body:**
```
{{1}} is unavailable for your {{2}} request. You haven’t been charged. Browse other artists on Alivestage.
```

**Variables (examples):**
| Index | Example |
|-------|---------|
| {{1}} | Arijit Live |
| {{2}} | 12 Aug 2026, 7:00 pm |

---

## Env vars (after Meta setup)

```bash
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=   # you invent; used for webhook GET challenge
WHATSAPP_API_VERSION=v21.0
```

**Webhook URL:** `https://YOUR_API_HOST/api/whatsapp/webhook`  
Subscribe to `messages` field.
