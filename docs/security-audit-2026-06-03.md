# CreatorHub Security Audit — 2026-06-03

**Scope**: `index.html`, `js/app.js`, `js/utils.js`, `supabase/migration.sql`, `supabase/migration-v2.sql`
**Test status**: unit `93/93` ✅ · playwright smoke `5/5` ✅

---

## TL;DR

The app's RLS layer authenticates **insert intent**, not **insert identity**. Anyone with a valid Supabase JWT can write rows with **someone else's `username`** in `author / poster / sender / from_user / reviewer / inviter_username / username`. There is **no server-side check that the username column equals the caller's profile username**. Combined with self-serve email signup (no invite gating, no email verification gate in code) this is the dominant abuse surface.

Severity legend: 🔴 critical · 🟠 high · 🟡 medium · 🟢 low

---

## 🔴 CRITICAL — Identity spoofing on every write

Every insert path takes the username/sender/author from the **client variable** (`myProfile.name`, `currentUser`) and the RLS check is only `auth.uid() IS NOT NULL`.

Affected (non-exhaustive):

| Table | Insert site | Spoofable column |
|---|---|---|
| `posts` | `app.js:1673` | `author`, `author_avatar` |
| `chat_messages` | `app.js:1248` | `sender`, `recipient` |
| `world_messages` | `app.js:1096` | `sender` |
| `notifications` | `app.js:1171, 853` | `username`(target), `from_user` |
| `recruits` | `app.js:1426` | `poster` |
| `match_demands` | `app.js:752` | `poster` |
| `local_demands` | publishLocalDemand | `poster` |
| `friends` | `app.js:853, 2329` | `username`, `friend_name` |
| `xp_records` | `app.js:200` | `username` (self-grant XP) |
| `reviews` | `app.js:846` | `reviewer` ← gated by `can_review` RPC (✅ partially safe) |
| `invitation_codes` | `app.js:850` | `inviter_username` |
| `tracking_events` | `app.js:4` | `username` (anonymous insert allowed by `WITH CHECK (true)`) |

**Impact**: Anyone logged in can:
- Post in the community as "运营老司机"
- DM victims as "支付宝官方" via `from_user`
- Send `world_messages` as another user
- Grant themselves arbitrary XP (`xp_records` insert is unbounded, then profile.xp is patched client-side — see also 🟠 below)
- Issue invite codes attributed to other users and harvest the +50 XP reward

### Fix
For every write, the username column **must equal `(select username from profiles where id = auth.uid())`**. Pattern:

```sql
CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  WITH CHECK (author = (select username from profiles where id = auth.uid()));
```

Repeat for `recruits.poster`, `match_demands.poster`, `local_demands.poster`,
`chat_messages.sender`, `world_messages.sender`, `notifications.from_user`,
`friends.username`, `xp_records.username`, `invitation_codes.inviter_username`,
`reviews.reviewer`, `comments.author`, `post_likes.username`.

For `friend_requests`, restrict `from_user` to caller. For `notifications`, also require that `from_user` matches caller (the recipient `username` can be anyone — that's intended).

---

## 🔴 CRITICAL — Self-grant XP / level / trust_score

`profiles` has a single `profile_update_own` policy on UPDATE; the WITH CHECK clause is missing, so a user can UPDATE their own row freely — **including `xp`, `level`, `trust_score`** — bypassing the `xp_records` ledger entirely.

Lines: `app.js:92, 202, 274, 406, 841, 846` all do unconstrained `profiles.update({...})`.

Plus the trust_score recompute (`app.js:846`) is **also client-driven**: client calls `calc_trust_score` RPC then writes the result back via `profiles.update({trust_score:r.data}).eq('username',reviewee)`. The RLS `profile_update_own` only matches when `username = caller.username`, so this PATH is actually broken for reviewing **someone else** — meaning trust_score never updates for the reviewee. But more importantly, it means a user can write `trust_score: 999` on their **own** profile.

### Fix
1. Drop `xp`, `level`, `trust_score` from the columns a user may UPDATE. Two options:
   - Column-level grants: `REVOKE UPDATE (xp, level, trust_score) ON profiles FROM authenticated;` plus a `SECURITY DEFINER` RPC `award_xp(reason, amount)` that enforces caps server-side.
   - Or move xp/level/trust_score into a separate `profile_stats` table that only `SECURITY DEFINER` functions can write.
2. Make `calc_trust_score` write the result inside the SQL function (currently it only returns; the client writes back) and call it from a trigger on `reviews INSERT`.

---

## 🟠 HIGH — Mass registration / bot signups

There is **no captcha, no rate limit, no email verification gate** in the application flow. `doRegister()` (`app.js:134`):

1. Reads form fields, validates length client-side only (`user≥2`, `pass≥6`).
2. Calls `sb.from('profiles').select('id').eq('username',user).maybeSingle()` — racey if two concurrent registers pick the same username (the unique index on `profiles.username` will fail one, but the auth user is already created → orphan auth row).
3. Calls `sb.auth.signUp({email, password, options.data: {username, role, role_label}})`.
4. **Manually inserts into `profiles`** bypassing the `handle_new_user` trigger.
5. If `_r.data.session` exists → auto-signs in **before email verification**, immediately calling `init()` and `track('user_register')`.

### Concrete abuse paths

| # | Abuse | How |
|---|---|---|
| 1 | **Disposable-email farms** | `+mailbox` aliases or temp-mail domains. Nothing blocks `*.mailinator.com` / `*.10minutemail.com`. |
| 2 | **Username squatting** | Register `admin`, `客服`, `支付宝`, brand names — combined with the spoofing bug above (🔴 #1) this becomes social-engineering payload. |
| 3 | **Race to skip profile insert** | If `sb.from('profiles').insert(...)` fails, the code re-reads with `.select()` and continues — but `handle_new_user` trigger has now also fired (it has the same `id`, so trigger insert succeeds first, manual insert fails with PK violation). The fallback `select` masks this. Audit: should drop the manual insert and rely on the trigger, OR drop the trigger and rely on manual insert with `ON CONFLICT DO NOTHING`. |
| 4 | **No XP/invite-reward dedupe by IP/email-domain** | `processInviteCode` (`app.js:853`) hands +50 XP to inviter per new signup with no cap. One attacker can mass-register N accounts and self-mine XP via their own invite link (`r.data.inviter_username===currentUser` guards self-invite **for the same login session** but not for a new login). |
| 5 | **xp_records flood** | Insert `xp_records` is rate-unlimited; `daily login bonus` check is client-side (`localStorage`); attacker can wipe localStorage and reclaim daily XP repeatedly. |

### Fix priorities
1. **Turn on Supabase email confirmation** (dashboard: Auth → Email → "Enable email confirmations"). Currently the code path at `app.js:163-164` handles both confirmed and unconfirmed flows but does not gate writes — so when confirmation is OFF, every signup becomes a write-capable session.
2. **Add Supabase Auth rate limits** (Dashboard → Auth → Rate Limits) — default is generous; cut signups/hour/IP.
3. **Cloudflare Turnstile** (or hCaptcha) on `doRegister` — invoke before `signUp`.
4. **Server-side username allowlist**: a `SECURITY DEFINER` RPC `register_profile(username text)` that rejects reserved names (`/admin|官方|客服|支付宝|微信|抖音|小红书|creatorhub/i`).
5. **Cap invite XP**: limit `addXPForUser(inviter, 50, ...)` to N/day per inviter. Enforce via a constraint or `award_xp` RPC.
6. **Move daily login bonus check to DB**: add `last_daily_xp_at` column to `profiles`; gate via RPC.

---

## 🟠 HIGH — Self-serve registration races leave orphans

`doRegister` does not run in a transaction:

```
1. select profiles where username=X → empty
2. signUp(email, pass)          ← creates auth.users row + maybe profile via trigger
3. insert profiles (...)         ← may collide with trigger row
```

If two clients concurrently register `username=alice`, both pass step 1, both succeed at step 2, one wins at step 3 (unique constraint), the loser is now an `auth.users` row **with no `profiles` row** (or with a profile they didn't pick the name for, if trigger ran first with `split_part(email,'@',1)`).

### Fix
Drop the manual `profiles.insert` block (`app.js:153-161`); rely on the `handle_new_user` trigger. The trigger inserts using `raw_user_meta_data->>'username'` (provided via `options.data.username` already at `app.js:151`), and `profiles.username UNIQUE NOT NULL` will reject the duplicate at `signUp` time. Return the auth error to the user.

---

## 🟠 HIGH — XSS via legacy non-escaped innerHTML paths

Most of the 42 `innerHTML =` sites use `escapeHtml(...)`, but a few embed values directly. Worth re-auditing:

- `app.js:1014` (`feedGrid` items): template literal injects `item.*` — verify each interpolation calls `escapeHtml`.
- `app.js:1041` (chat contact list)
- `app.js:1141` (chat messages: text is escaped, but `dealBarHtml()` output is not — verify that helper escapes deal title / partner)
- `app.js:1490, 1512` (brand/creator seeking columns) — these read from `brandSeekingData` / `creatorSeekingData` which include user-published `match_demands`. Required.
- `app.js:1694` (postGrid) — same.

`utils.escapeHtml` itself is solid (10/10 unit tests including `<img src=x onerror=...>`). The risk is **forgetting to call it**, not the function. Add a lint rule or codemod to flag string-concat templates that interpolate without `escapeHtml(...)`.

The chat reply is taken from a hardcoded list (safe). World-chat random "from" uses `allUsers` data (the seeded list — safe today, but if `allUsers` ever pulls from `profiles.username` directly into a non-escaped template, it becomes a vector).

---

## 🟠 HIGH — Open SELECT on tracking_events

```sql
CREATE POLICY "track_read_own" ON tracking_events FOR SELECT USING (true);
```

Anyone authenticated can read **everyone else's** tracking events — including `event` (e.g. `user_register`, `chat_message_send`, `target_user`), `props`, `username`, `session_id`. This is a PII / behavior-leak risk.

### Fix
```sql
CREATE POLICY "track_read_own" ON tracking_events FOR SELECT
  USING ((select username from profiles where id = auth.uid()) = username);
```

Plus, given `INSERT WITH CHECK (true)` (anonymous insert), drop `session_id` and `username` enforcement to be server-stamped via a trigger that overrides with `auth.uid()`'s username if present.

---

## 🟡 MEDIUM — `get_poll_updates` is STABLE but parameter-trusted

`get_poll_updates(since_ts, username_query, post_ids)` accepts `username_query` from the client. The function returns notifications / chat_msgs for `username_query`, so a caller can pass **anyone's** username and read their notifications / chat messages (bypassing the per-row `chat_read_own` / `notif_read_own` policies since the RPC runs as `STABLE`, not `SECURITY DEFINER` — but row visibility through an RPC still depends on the caller's RLS context).

Verify in Supabase what role this RPC runs under. If it runs as `postgres` / `service_role` indirectly via STABLE planner inlining, it leaks. Quickest fix:

```sql
CREATE OR REPLACE FUNCTION get_poll_updates(...) RETURNS jsonb AS $$
DECLARE
  caller_username text;
BEGIN
  SELECT username INTO caller_username FROM profiles WHERE id = auth.uid();
  IF caller_username IS NULL OR caller_username != username_query THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  ...
END; $$ LANGUAGE plpgsql STABLE SECURITY INVOKER;
```

---

## 🟡 MEDIUM — `confirm_deal` / `complete_deal` lack authorization

Both are `SECURITY DEFINER` (migration-v2.sql) and have **no caller check**:

- `confirm_deal(p_deal_id, p_partner)` — any authenticated user can confirm any deal and set themselves (or anyone) as `deal_partner`.
- `complete_deal(p_deal_id)` — any authenticated user can mark any `active` deal as `completed`.

### Fix
Add caller checks:

```sql
-- in confirm_deal
IF (SELECT poster FROM match_demands WHERE id = p_deal_id) != caller_username THEN
  RETURN 'error: not your deal';
END IF;
-- in complete_deal
IF caller_username NOT IN (poster, deal_partner) THEN ...
```

Where `caller_username` = `(SELECT username FROM profiles WHERE id = auth.uid())`.

---

## 🟡 MEDIUM — `can_review` accepts arbitrary `p_reviewer`

`can_review(p_reviewer, p_reviewee, p_deal_id)` — caller supplies reviewer. The function is `SECURITY DEFINER` but doesn't check that `p_reviewer = caller`. Combined with the `reviews` insert (which embeds `reviewer:currentUser`), a user could pre-pass the gate using someone else's username + call insert with their own — currently OK, but if the insert RLS gets relaxed, this becomes spoofable.

Same fix pattern: assert caller identity inside the function.

---

## 🟡 MEDIUM — Realtime `chat_messages` filter is by `recipient` only

`setupRealtime` subscribes with `filter:"recipient=eq."+currentUser`. The filter is server-evaluated, so it doesn't leak. But note: with the spoofing bug (🔴 #1), an attacker can deliver chat messages **to anyone** and they'll receive them via realtime. Coupled with cross-user chat replies that auto-populate the contacts list, this is a low-friction DM-spam vector.

### Fix
Rate-limit `chat_messages` inserts per sender (DB-level: `CREATE FUNCTION check_chat_rate()` + trigger; or app-level via `SECURITY DEFINER` RPC with a per-user counter).

---

## 🟡 MEDIUM — `tracking_events INSERT WITH CHECK (true)` is anonymous

Allowing anon inserts is fine for funnel analytics, but the `props` JSONB is unbounded. An attacker can flood the table with arbitrary JSON and bloat the DB.

### Fix
- Add a row-size / rate limit (Postgres `pg_cron` cleanup + a `BEFORE INSERT` trigger that rejects `length(props::text) > 4096`).
- Truncate `props` server-side.

---

## 🟢 LOW — Other observations

- `index.html` is 4 lines — minified single-line. Hard to review. Consider keeping a non-minified copy in repo, ship minified.
- Supabase URL/anon-key are presumably hardcoded somewhere in the bundle (didn't see them in the read excerpts but they have to be). That's by design (anon key is public), but make sure **service_role** key is **never** in the client.
- `localStorage` is the source of truth for: `creatorhub_session`, `creatorhub_notify_list`, `creatorhub_notifications`, `creatorhub_lastLogin`, `_seen_notifs`, `creatorhub_events`. None contain secrets, but a user can clear them to reset daily-XP, replay notifications, etc. — see 🟠 #5.
- No CSP header in `vercel.json`. Add one — at minimum `script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; object-src 'none'; frame-ancestors 'none';`. Inline event handlers (`onclick="..."` everywhere) force `unsafe-inline`; consider a longer-term move to delegated listeners.
- `vercel.json` sets `Cache-Control: public, max-age=3600` for **everything including index.html**. After a security fix, users could be stuck on the cached vulnerable bundle for up to an hour. Add a separate rule for `/index.html` and `/js/*` with `max-age=0, must-revalidate` (or hash the asset filenames).
- No `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` headers configured.

---

## Suggested fix order

1. **Today**: turn on Supabase email confirmation + auth rate limits (dashboard only, zero code).
2. **This week (P0)**: write `supabase/migration-v3-security.sql` with:
   - Per-table `*_insert_own` policies enforcing username == caller's profile.username.
   - REVOKE on `profiles(xp, level, trust_score)` + `award_xp` RPC.
   - Caller checks in `confirm_deal`, `complete_deal`, `can_review`, `get_poll_updates`.
   - Tighten `tracking_events` SELECT policy.
3. **Next sprint (P1)**: Turnstile on register; reserved-username allowlist; CSP + security headers in `vercel.json`; XSS sweep on the 42 `innerHTML =` sites.
4. **Backlog (P2)**: Move daily-login XP to DB; per-sender chat rate limit; ship asset hashing.

