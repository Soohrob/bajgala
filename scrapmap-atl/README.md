# ScrapMap ATL

Matches Atlanta neighbors into shared compost-pickup groups and splits the cost.

```bash
npm install
npm run dev     # http://localhost:5175
npm run build   # production build to dist/
```

## Modes

- **Demo mode** (no setup): runs entirely in memory with seeded data. Everything is clickable; nothing persists across refresh. This is what you get out of the box.
- **Live mode** (Supabase): real accounts (email magic links), persistent interest pins and groups, live updates across devices, working invite links.

## Going live — one-time setup (~10 minutes)

1. Create a free project at [supabase.com](https://supabase.com) (any region; pick a strong DB password, you won't need it day-to-day).
2. In the dashboard, open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. (Recommended) Run [`supabase/seed.sql`](supabase/seed.sql) the same way — it loads the demo neighborhoods' pins and the two Old Fourth Ward groups so the map isn't empty.
4. Copy `.env.example` to `.env.local` and fill in the two values from **Project Settings → API** (Project URL and the `anon` public key).
5. Restart `npm run dev`. The amber "demo mode" banner disappears and sign-in appears in the header.

Email magic links work out of the box on Supabase's built-in sender (rate-limited to ~2/hour; fine for a pilot). For real volume, plug a custom SMTP provider into Supabase Auth settings.

### Enable 6-digit sign-in codes (one-time template edit)

The app asks users to type a 6-digit code from the email instead of clicking a link.
For the code to actually appear in the email, edit two templates under
**Authentication → Emails → Templates** — add `{{ .Token }}` to both **Confirm signup**
and **Magic Link**. Suggested body for both:

```html
<h2>Your ScrapMap ATL sign-in code</h2>
<p>Enter this code in the app: <strong style="font-size:24px">{{ .Token }}</strong></p>
<p>Or tap this link on this device: <a href="{{ .ConfirmationURL }}">sign in</a></p>
<p>If you didn't request this, ignore this email.</p>
```

(Suggested subject: `Your ScrapMap code: {{ .Token }}`.) The link keeps working as a fallback.

## Migrations (run in order, each once, in the SQL editor)

1. `supabase/schema.sql` — base tables, RLS, activation trigger
2. `supabase/seed.sql` — demo pins + example groups (optional)
3. `supabase/migration-002-leave-group.sql` — empty-group cleanup on leave
4. `supabase/migration-003-profiles-details-notifications.sql` — display names, group Venmo/notes, notifications + triggers
5. `supabase/migration-004-board-matchmaking.sql` — group board (member-only messages) + proactive "your block is ready" matchmaking nudges

## Email notifications (optional, ~15 min)

In-app notifications work with migration 003 alone. To also send them by email:
create a free [Resend](https://resend.com) account, then follow the setup steps at the
top of [`supabase/functions/notify-email/index.ts`](supabase/functions/notify-email/index.ts)
(deploy the function, set the API key secret, add a database webhook on `notifications` inserts).

## Partner view

`?partner=1` on the app URL (also linked from the bottom of Learn) renders the
pitch dashboard for pickup services: live interest counts, groups forming vs.
active, projected revenue, and the demand map.

## How the pieces fit

- `src/data/adapter.ts` — one data interface, two backends: `localAdapter.ts` (demo) and `supabaseAdapter.ts` (live). `AppContext` picks one at boot based on env vars and the UI never knows the difference.
- `src/lib/geocode.ts` — address lookup via OpenStreetMap Nominatim (free, no key, ~1 req/sec — swap in Mapbox when volume grows). Results are snapped to a ~110 m grid **before** being stored or shown: the app never keeps exact addresses.
- **Invite links** — every group has an invite code; `?join=CODE` on the app URL joins that group (after sign-in, in live mode).
- **Activation** — groups start as `forming`; a DB trigger flips them to `active` when membership reaches the target (default 4).
- **Realtime** — live mode subscribes to Postgres changes, so a join on one phone updates the cost split on another within a second.

## Not built yet (deliberately)

- Activation/notification emails (needs a Supabase Edge Function + Resend)
- Partner dashboard (interest heat by neighborhood, for pitching pickup services)
- Payments — by design; see strategy notes. Members settle via Venmo with the host for the pilot.
- Address-fraud defenses, custom map tiles, native app wrap.
