# Independent private installation

This is the current installation guide. Historical phase reports and configurations under config/cloud, config/pages-auth and config/private-access describe the original installation: do not copy their URLs or apply them to a new project. This guide never requires access to the original instance.

The interface remains French. Each instance uses its own Supabase project, users and frontend origin. Public source code does not make an instance's inventory public.

## 1. Prerequisites and local verification

Use Node.js 24+, npm, Git with full history, and Docker with Linux containers for local backend tests. Clone your own repository/fork and run:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run format:check
npm run db:start
npm run env:local
npm run test:db
npm run test:db:concurrency
npm run test:db:api
npm run test:shared
npm run dev -- --strictPort
```

Open http://127.0.0.1:5173 and local Mailpit at http://127.0.0.1:55324. Local signup and reserve creation are available; local email is captured, not sent. The CLI applies all seven migrations to a new local stack without seeds. Do not expose its ports publicly. Use db:reset only for a disposable LOCAL stack you intentionally want to erase. These commands do not require linking a hosted project. Full Git history is needed by the historical-client compatibility test.

## 2. Create your own hosted resources (manual)

Create a new Supabase project you control, PostgreSQL major 17 with pgcrypto in extensions. Record its public 20-letter reference and keep the database password in a password manager. Check the provider's current plan, region, email and usage limits. Never use the original project's reference.

Choose a unique Cloudflare Pages project name and its exact HTTPS origin. Use a separate frontend origin per instance: Auth, cache and service workers are origin-bound. Subpath hosting is not supported.

Generate configuration locally (replace BOTH examples):

```sh
npm run instance:config -- --project-ref abcdefghijklmnopqrst --site-url https://your-pantry.pages.dev
```

The ignored .tmp/instance directory contains Auth/API configuration, exact Edge origins, and frontend public settings. Generation makes no network calls and changes no remote settings. Re-running overwrites these generated files. Review them before use. Copy frontend.example to .env.cloud.local and replace the placeholder with YOUR project's publishable key. Only URL and publishable key belong in VITE_*; never service_role, secret keys, database passwords or account passwords.

## 3. Migrations and private API

The following are administrator operations on YOUR NEW project, not commands to run on the original instance. Check the Dashboard project name/reference before every remote operation. Log in using the CLI's interactive flow; do not put credentials in command arguments or chat.

```sh
npx --no-install supabase login
npx --no-install supabase link --project-ref YOUR_PROJECT_REF
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run --skip-vault
```

For a fresh project, the dry run must list exactly the seven files in supabase/migrations, from 20261026000100 through 20261030000100. Stop if there are existing application objects or unexplained migration history. Do not reset or repair a hosted project to force a match.

After reviewing the target and dry run:

```sh
npx --no-install supabase db push --linked --skip-vault
npx --no-install supabase migration list --linked
npx --no-install supabase db query --linked --file scripts/backend/phase5-audit.sql
```

Expect seven aligned versions and an empty violations array. Account/reserve counts may be zero at this stage. In the Dashboard expose only public as the application API schema, never private; disable automatic exposure of new tables if offered. RLS reads and explicit RPC privileges must remain intact. Do not run local fixtures, seeds, Auth/API tests or concurrency tests against hosted services.

## 4. Auth and private accounts

Review/apply the generated configuration to the SAME explicit project:

```sh
npx --no-install supabase config diff --workdir .tmp/instance --project-ref YOUR_PROJECT_REF
npx --no-install supabase config push --workdir .tmp/instance --project-ref YOUR_PROJECT_REF
```

Check the diff: public signup remains disabled, anonymous login disabled, email confirmation enabled, password length 12 with upper/lowercase and digits, refresh rotation enabled, Site URL your frontend, callback exactly your frontend + /auth/callback. No wildcards. Do not apply the repository's historical owner-specific config directories.

Create only the two intended email/password users using Dashboard Authentication > Users > Add user > Create user. Verify the intended person's email identity out of band before using administrative auto-confirmation. The administrator provisions unique strong passwords and shares them through a trusted password-manager channel, never issues, logs or chat. Do not grant the second person Dashboard administrator access for this purpose. This is deliberate private provisioning, not unrestricted signup. The script below never creates or confirms users and needs no service key.

For email signup confirmation if you later intentionally design a signup workflow, configure your own SMTP and copy supabase/templates/confirmation.html into the Confirm signup template: the app expects RedirectTo + #confirm=TokenHash. Default token-fragment invitation, recovery and magic-link flows are not implemented. Do not use Dashboard Invite user as a substitute for Create user in this procedure. Email delivery and recovery policy require manual verification; SMTP is not required for the administratively confirmed password-login bootstrap described here. Do not temporarily open public signup on the existing production instance.

## 5. Edge Function and OFF

Deploy against your explicit project after migrations:

```sh
npx --no-install supabase secrets set --env-file .tmp/instance/off.env --project-ref YOUR_PROJECT_REF
npx --no-install supabase functions deploy product-lookup --project-ref YOUR_PROJECT_REF
```

Keep verify_jwt=true (supabase/config.toml). OFF_ALLOWED_ORIGINS must contain only origins you intentionally allow. To use local dev:cloud, explicitly add its exact origin and callback to your own settings; the generator intentionally adds no localhost or preview origins. There is no privileged key in the function: it checks the user and membership before calling OFF. See OPEN_FOOD_FACTS.md for attribution, API usage registration, image privacy, manual fallback and third-party licensing. The current provider identification names the original project maintainer; independent operators should set an appropriate User-Agent/contact in their own function before deploying. This guide does not decide artwork redistribution rights.

## 6. First reserve using existing authorization

With .env.cloud.local configured, run this ONLY for your new private project in your personal terminal:

```sh
npm run instance:init -- --project-ref YOUR_PROJECT_REF
```

The command displays its target and a request UUID, requires you to type the project reference again, and prompts for the first account email and password (hidden). It authenticates normally with the public key, verifies confirmation, checks existing membership and uses create_reserve as that user. No direct SQL write, admin key or public signup. Keep the request UUID until the result is known. If a response is lost, repeat with --request-id THE_SAME_UUID; existing membership stops another creation. Do not run simultaneous initializers. On refusal, verify the server state before starting a new intention.

After deployment, sign in as the owner, open Compte et réserve, generate the business invitation for the second administratively created account. Share its temporary link privately; the second user signs in with the matching email and accepts. Do not add the second user as a Supabase administrator merely to join the reserve. Validate that an unrelated account cannot read the reserve. Cloud mode continues to hide signup and new-reserve UI; initialization is an explicit administrator-terminal operation.

## 7. Build and Cloudflare deployment

```sh
npm run build:cloud
npm run preview:cloud -- --strictPort
```

The generated dist-cloud/_headers CSP allows only the validated VITE_SUPABASE_URL origin in connect-src, plus self; no original backend is used as fallback. public/_headers is a TEMPLATE, not a deployable headers file. Deploy dist-cloud, never public or the repository root. Cloud builds fail if URL/key are absent or invalid. A demo build without backend grants no backend connection; local builds allow only configured loopback.

Connect YOUR repository to YOUR Pages project. Build command: npm run build:cloud; output: dist-cloud; Node 24+ (CI pins 24.22.1). Configure the two public VITE_* values in Production. Disable Preview deployments and remove production configuration/bindings from Preview. Protect main and require the application and backend CI jobs before merging. Pages builds independently after a push to main; a successful build alone is not a review gate. No Supabase administrative or account credentials belong in Pages settings.

A Pages creation may immediately deploy: review its parameters before clicking Save and Deploy. This guide describes operations for your own installation; no remote creation/deployment was performed for this change.

## 8. Manual acceptance and troubleshooting

Verify served CSP targets your own Supabase; no placeholder or original backend remains. Check password login, first reserve, matching invitation, synchronization, refusals for outsiders, known/unknown barcode with manual fallback, and signout on both users. Perform only disposable test movements on your own instance. Verify installation and offline/signout/update behavior on real Android/iOS separately from automated browser checks.

- CSP connect-src refusal: inspect the BUILT _headers, rebuild after environment changes, and check hosting serves that file. Vite preview does not apply Cloudflare header rules itself.
- No reserve accessible: use the private initializer; Cloud mode deliberately has no create button. Check confirmed account and migrations before retrying.
- Confirmation link fails: check exact callback and custom template; unsupported invite/recovery links are not handled by this UI.
- OFF 401: check JWT verification, confirmed user and membership. OFF 403/CORS: inspect exact OFF_ALLOWED_ORIGINS. OFF unavailable/429: keep manual entry and respect the shared cooldown.
- Wrong migration target/history: stop. Never reset a hosted project or run fixtures there.
- Existing browser copy after config changes: use separate origins/profiles for instances; do not erase a user's private cache to force an update.

## Optional operations and limitations

User JSON export/restore is described in PHASE5.md; files and browser cache are private and unencrypted. Administrative backups are separate, optional tools (BACKUP.md and SAUVEGARDE_CHIFFREE.md contain historical operations). cloud-backup.mjs takes an explicit project reference. restore-local.mjs now also requires --project-ref matching both the archive and linked project; its container is isolated, but it reads source fingerprints remotely, so it is NOT an offline-only validation tool. phase5-preflight.mjs takes the expected reference as its positional argument and reads hosted metadata/fingerprints. Neither is required to initialize an instance. Do not use them against a project without authorization.

No schema migration, public signup switch, existing production setting change or account/data operation is required by this implementation. The original deployment retains its closed UI and the same CSP backend origin when rebuilt with its existing public settings. External account creation, SMTP delivery, Edge deployment, Pages integration and physical-device acceptance still require human verification.
