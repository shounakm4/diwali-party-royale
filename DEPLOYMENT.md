# Production deployment

Deployed on 7 November 2026 (Asia/Singapore).

- Public app: https://diwali-party-royale.vercel.app
- Projector / host: https://diwali-party-royale.vercel.app/host
- Phone join: https://diwali-party-royale.vercel.app/join
- Vercel project: https://vercel.com/shounak3/diwali-party-royale
- Source: https://github.com/shounakm4/diwali-party-royale (`main`)
- Supabase project: `zoeutzdvhvcfhiebitrb`, named `diwali-party-royale` in the `Diwali Party Royale` organization
- Supabase region: South Asia (Mumbai), `ap-south-1`
- Plans selected: Vercel Hobby and Supabase Free

## Verified against production

- Public HTTPS landing page returned HTTP 200 without a Vercel login.
- Actual HTTP integration tests passed against the production domain: eight concurrent player joins, ninth-player rejection, hidden answers/votes, duplicate submissions/votes, scoring, transitions in both games, anonymous social ballots, and identity recovery.
- Supabase Realtime WebSocket subscription received a server-committed change after a player joined. The event row contained only `topic` and `version`.
- Direct anonymous REST access to `party_rooms` returned HTTP 401.
- SQL policy audit confirmed room RLS enabled; anonymous room reads/writes denied; anonymous signal reads allowed but writes denied; atomic update RPC executable by service_role only. The Realtime publication includes `party_signals` only.
- Safari successfully created a cloud-backed host lobby with a production-domain QR join link and no local-mode banner.
- Original app implementation: 17 engine tests, local integration tests, TypeScript checking and production build passed.

Physical eight-phone play has not been performed. The production HTTP simulations use eight independent tokens and real database requests.

## Credentials and future updates

The three Supabase environment variables are configured in Vercel for Production and Preview. The server key is a sensitive environment variable named `SUPABASE_SERVICE_ROLE_KEY`, never a NEXT_PUBLIC value. Credentials are not committed to GitHub or saved in this document. The Vercel GitHub app installation on shounakm4 is restricted to this repository.

The current deployment uses existing legacy anon/service_role keys for compatibility with the original setup instructions. Supabase displayed an early-2027 legacy-key retirement notice: migrate these environment values to the project's publishable/secret keys before that retirement, redeploy, and rerun the HTTP and Realtime checks. Do not disable existing keys before the replacement is verified.

Pushes to `main` trigger Vercel builds. Room state is in Supabase, so deployments do not discard party scores. Create a new party for new sessions; room access expires after 48 hours. Cleanup is manual as documented in the SQL migration.

## 8 November 2026: prediction fairness and timer controls

- Social prediction bonuses are evaluated against only the other players’ ballots. A player cannot change their own prediction reward by voting for their prediction. Ties among the remaining ballots count, and zero remaining ballots means zero bonus.
- Individual predictions remain private after reveal; each player receives only their own prediction outcome. Aggregate bars still include all ballots.
- Hosts can set four timers independently, from 5 to 300 seconds, in the lobby or between rounds. Defaults are 60 seconds for bluff writing, 45 for bluff voting, 20 for prediction, and 45 for social voting. Active countdowns remain fixed.
- Legacy rooms use default timers when missing settings. Already-awarded scores are kept, with a note on results scored under the earlier rule. No schema migration is needed.
- Regression coverage now includes 25 engine tests and 3 HTTP integration tests, including the former self-fulfilling prediction exploit, own-vote independence, ties, timer validation, authorization, and legacy room recovery.
