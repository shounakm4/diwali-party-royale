# 🪔 Diwali Party Royale

Two complete multiplayer party games for **2–8 friends**, with a projector host and individual phone controllers. Built with Next.js App Router, TypeScript, Tailwind CSS and Supabase Postgres + Realtime. No accounts, downloads or player sign-ins.

**Live:** [diwali-party-royale.vercel.app](https://diwali-party-royale.vercel.app) · [Host](https://diwali-party-royale.vercel.app/host) · [Join](https://diwali-party-royale.vercel.app/join). Deployed to Vercel with Supabase Postgres and Realtime on 7 November 2026. See `DEPLOYMENT.md` for verified checks. Local multiplayer still works without credentials.

## Play on your laptop and phones now

Requires **Node.js 22.13+** (Node 24 recommended), npm and devices on the same Wi-Fi.

```bash
cd "/Users/shounak/Desktop/Diwali Party Royale"
npm ci
npm run dev
```

Or double-click **Start Party.command** in this folder. Keep its Terminal window open.

1. Open **http://localhost:3000/host** on the laptop. Click **Create Party**.
2. Scan the QR with each phone. The local server automatically puts your laptop’s LAN IPv4 address into the QR, even when the host opened localhost.
3. Choose unique nicknames. Two to eight players can join. The host can scan with their own phone and take a player seat.
4. Select a game and start. For Most Likely To, expand **Set the vibe & customize prompts**, edit settings, and click **Save game settings** first.
5. The host moves from each reveal to its leaderboard and then to the next round. Writing, prediction and voting phases close automatically at their deadlines or when everybody has acted.
6. Use the speaker icon to enable sounds. Sound starts muted to respect browser autoplay restrictions. Headphones are unnecessary; enable sound on the projector only if preferred.

If the QR chooses the wrong interface (VPN/Ethernet), set this in `.env.local`, then restart the dev server:

```dotenv
NEXT_PUBLIC_JOIN_ORIGIN=http://YOUR_LAPTOP_WIFI_IP:3000
```

Phones must use the LAN address, **not localhost**. If they cannot connect, check both devices are on the same Wi-Fi, allow Node through your Mac firewall if prompted, and avoid guest Wi-Fi client isolation. Local play uses plain HTTP on your trusted LAN. Keep the laptop awake and the host tab visible during a game.

Refresh restores the saved host/player identity in the same browser and origin. A room lasts 48 hours. Clearing browser data, switching browsers or changing between localhost and a LAN origin does not transfer your seat. **Leave** forgets the current browser’s identity; use refresh for reconnection. To reset every score, leave the host screen and create a new party. Restarting a match preserves earned points.

## The games

### Bluff Masters — five rounds

- Default: 60 seconds to write a fake answer, then 45 seconds to choose the truth.
- +1,000 for choosing the truth; +500 per opponent fooled by your fake answer.
- Authors cannot vote for their own fake answer, including shared duplicate cards.
- Exact and close spelling variants are grouped. Submissions containing a canonical truth or alias as a whole phrase are excluded from fake cards. Matching the correct answer or one of its aliases merges into the truth without fake-answer credit. Similar fake answers share a card; every author gets +500 for each opponent fooled.
- Zero/one submissions, or no usable fake choices: reveal the answer and skip scoring, with an explanatory message.
- Text matching normalizes punctuation, case, accents and leading articles and uses conservative edit distance. This is not a semantic-language model: maintain aliases for plausible equivalent names/phrases when editing questions.

### Who’s Most Likely To? — eight rounds

- By default, an optional 20-second secret prediction phase comes **before** the 45-second anonymous voting phase. Skip a prediction if you like.
- +300 for predicting a player tied for the most votes **among the other players’ ballots**. Your own vote is excluded from your prediction score, so it cannot make your prediction come true. Receiving votes earns zero points. If nobody else votes, your prediction earns zero points.
- The result bars still show all votes. Your phone explains the outcome using only the other players’ votes; individual predictions stay private, including after the reveal.
- Self-votes are disabled by default; the host can enable them. Self-predictions are allowed.
- **Family Friendly** draws only family prompts. **Friends Unfiltered** draws from the entire bank, including cheeky, non-explicit prompts.
- A host can load a starter playlist, add/edit/remove/reorder it and save exactly eight custom prompts, or leave it empty for a random selection. Custom prompts are tagged with the selected mode. Remove any Friends prompts before saving in Family mode.

Party totals and per-game scores persist between both games and between matches. Either game can be played alone or first. Restart uses new rounds where possible and keeps scores. Ties share a rank; join order decides the display order within a tie. The final podium shows the top three seats and their shared ranks.

## Host-controlled round timers

Open **Round timers** in the host lobby, or on a reveal/leaderboard between rounds. Set each phase independently (5–300 whole seconds): Bluff Masters writing and voting, and Most Likely To prediction and voting. Click **Save round timers** before starting the match or next round. Values stay in the room until changed and affect future rounds; active countdowns cannot be edited. Phases still end early when everyone finishes.

Older rooms without timer settings use the defaults above without changing an active deadline. Already awarded points are preserved; old scored social rounds carry a note that they used the earlier rule.

## Customize the banks

- `data/trivia.ts`: **34 source-linked questions**, each with one canonical answer, equivalent aliases, an explanation and a source URL. Categories include Diwali, Indian culture/food, Bollywood, animals and strange world/space facts. Add correct-answer aliases before using new questions. Source URLs and explanations are only sent with the reveal.
- `data/prompts.ts`: **58 prompts** (42 family, 16 friends). Change the text or add entries with `mode: 'family' | 'friends'`.
- The host’s live prompt editor is room-specific and requires no source changes.

Source examples: [NASA planet facts](https://science.nasa.gov/venus/venus-facts/), [Natural History Museum](https://www.nhm.ac.uk/discover/octopuses-keep-surprising-us-here-are-eight-examples-how.html), [Incredible India](https://www.incredibleindia.gov.in/en/festivals-and-events/diwali), [Spices Board India](https://indianspices.com/spice-catalog/saffron.html), [British Film Institute](https://www.bfi.org.uk/lists/best-cricket-films-first-xi). Each entry links its own supporting source.

## Supabase setup — when ready

1. Create a Supabase project. Save its database password securely; this app does not need that password.
2. In the project’s **SQL Editor**, run `supabase/migrations/001_party.sql` once. It creates private room storage, an atomic update RPC, non-sensitive wake-up signals, access policies and the Realtime publication entry.
3. In project API settings, copy your project URL, legacy `anon` public key, and server `service_role` key. New publishable/secret keys can also be used where compatible with your Supabase project, but the legacy keys are the straightforward setup for this MVP.
4. Copy `.env.example` to `.env.local` and populate:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
# optional; normally omit for cloud hosting
NEXT_PUBLIC_JOIN_ORIGIN=
```

5. Restart Next.js. The **LOCAL PARTY** banner should disappear. Create a **new** party; local rooms are not migrated to Supabase.
6. In Supabase Realtime/database publication settings, confirm `party_signals` is enabled under `supabase_realtime`. **Do not publish `party_rooms`**.
7. Run the integration tests against this configured local app. Then join from two browsers, start each game, refresh a player during voting, and confirm synchronization. To confirm Realtime itself, inspect the browser WebSocket connection: a `party_signals` event should trigger an API sync. Polling still keeps play working if WebSockets are unavailable.

Never put the service-role key in a `NEXT_PUBLIC_` variable, source file or GitHub commit. `.env.local` and local databases are ignored by Git.

## Vercel deployment — reproducing the setup

The production project is connected to `shounakm4/diwali-party-royale` on the `main` branch. The instructions below reproduce this setup in another Vercel project.

1. Finish your local playtest and the Supabase setup above.
2. In Vercel, choose **Add New → Project**, import `shounakm4/diwali-party-royale`, and choose the **Next.js** preset. Root directory: repository root. Build command: `npm run build`. Install command: `npm ci`. Leave output directory at its framework default.
3. Choose **Node.js 24.x** in project build/runtime settings (22.x also works with Supabase).
4. Add all three Supabase environment variables above to Production and, if used, Preview. Leave `NEXT_PUBLIC_JOIN_ORIGIN` unset so QR links use the current deployment domain.
5. Deploy. Open the resulting HTTPS URL on the projector and `/join` on phones. Create a fresh party. Check no LOCAL PARTY banner appears.
6. If Vercel preview protection requires a Vercel login, use the production domain for friends; players should never need accounts for the game.
7. Run `TEST_URL=https://YOUR_DOMAIN npm run test:integration`, then perform a real phone/projector check. That command creates test rooms in the target database.

Vercel requires Supabase; the SQLite fallback deliberately refuses to run there because ephemeral files cannot reliably share room state across instances. Environment changes to `NEXT_PUBLIC_` values require a new build. Official references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Verification

```bash
npm test                 # pure game rules, full eight-player matches, privacy, retries
npm run typecheck
npm run build
npm start                # in a separate terminal; do not run on a port used by dev
npm run test:integration  # actual HTTP + concurrent eight-player joins/actions
```

`TEST_URL` can target a different running app. Tests use generated test rooms, not fixtures or mock multiplayer. Unit tests inject server time to exercise deadlines without waiting for real countdowns. Integration tests run against whichever storage backend is configured.

Verified: 25 engine tests, 3 local HTTP integration tests, TypeScript checking, production build, Safari landing/host/player flows and refresh recovery. After deployment, the HTTP integration suite also passed against the public HTTPS URL using real Supabase storage, including eight concurrent players and both games. Supabase Realtime delivered a committed revision event over WebSocket; anonymous direct access to `party_rooms` returned HTTP 401. The production landing page and cloud-backed host lobby were checked in Safari. Physical eight-phone play remains unverified.

## How reliability and privacy work

- `lib/engine.ts` is the single server-authoritative state machine. Clients send intentions, never scores or deadlines.
- `app/api/party/route.ts` authorizes each request using a 256-bit bearer token; only SHA-256 token hashes are stored. Host and player tokens are separate. Authorization is sent in a header, never the QR or join URL.
- `lib/store.ts` uses persistent SQLite for genuine LAN multiplayer or Supabase Postgres for cloud hosting. SQLite uses WAL and atomic compare-and-swap. The Supabase RPC uses an atomic `UPDATE ... WHERE version = expected` and runs notifications in the same transaction. Conflicts reload and retry up to 16 times. No in-memory room map or process-local locking.
- Duplicate submissions/votes cannot replace accepted choices. Phase and round IDs reject late actions; expected versions reject repeated/stale host commands. Scoring is committed once with the phase transition.
- Host/player views are explicitly projected: no submissions before voting, no truth flag before reveal, no votes before reveal, and only aggregate votes for the anonymous game even after reveal. Source banks are imported by the server; the player bundle does not include the trivia answers.
- `party_rooms` has RLS and no anonymous/authenticated grants. Only the server service role accesses it and the update RPC. `party_signals` contains only random topics and revision numbers; these are intentionally public read-only wake-up notifications. They never include game data or credentials. Browsers cannot write signals or rooms.
- Supabase Realtime wakes the authorized API fetch; a 1.2-second polling fallback also restores missed updates. Views ignore older revisions. Displayed time uses server time with a network midpoint estimate. Server receipt time determines eligibility; no grace period is granted to late packets.
- Deadlines are evaluated on authorized client heartbeats/actions, which fits Vercel serverless execution. If every device sleeps or disconnects, the next request advances the expired phase exactly once. It does not run through unseen rounds. A disconnected player remains eligible until the deadline; no fake votes are generated. The host can close a phase early.
- Public hosting should use HTTPS and the hosting provider’s rate limits/WAF for abuse protection. The MVP has no accounts, CAPTCHA or distributed application rate limiter; keep party PINs among your guests.
- Room access expires after 48 hours. Optional SQL cleanup is included in the migration; expiration does not automatically delete rows. Delete expired rooms/signals manually or add a scheduled cleanup when you deploy.

## Project map

```text
app/                   landing, host, player and API routes
components/Party.tsx   host/projector and phone interfaces, sync and sound
components/Decor.tsx   original vector diya and festive decorations
lib/engine.ts          game rules, scoring, safe views, deadlines
lib/store.ts           Supabase / persistent local storage adapters
data/                  editable question and prompt banks
supabase/migrations/   schema, policies, transaction RPC, realtime signals
tests/                 game engine simulations
integration/           real concurrent HTTP multiplayer tests
```

No subscriptions, paid services or external assets are necessary for local play. The visuals use CSS, an original SVG diya, emoji avatars and Lucide icons. Respect reduced-motion preferences; animations never gate the state machine.
