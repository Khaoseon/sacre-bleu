# Product lookup and Open Food Facts

Current integration, consolidated from the [French phase-4 record](history/OPEN_FOOD_FACTS_FR.md) and [budget correction record](SCANS_SIMULTANES_OFF.md). For installation use [INSTALL.md](INSTALL.md); owner-specific deployment steps are historical.

## Request path

Search the confirmed personal catalogue first, using exact barcode then the supported UPC/EAN equivalence. A known product causes no Edge/OFF/Auth/budget lookup. An unknown code may call Supabase `product-lookup`, authenticated with the user's JWT. The Edge handler verifies Auth, confirmed non-anonymous identity and RLS membership, then claims the shared PostgreSQL slot using that user's rights. No service-role key.

`src/productInfo.ts` defines the provider contract, `productLookupClient.ts` the browser adapter, `productLookupHandler.ts` the authorization/budget boundary, and `productLookupServer.ts` the OFF adapter. The upstream host/path are fixed: `world.openfoodfacts.org/api/v3.6/product/<code>`, with redirects refused, `lc=fr`, `cc=ch` and only code/name/brand/quantity/category/front-image fields. The client cannot proxy an arbitrary URL. No account, pantry, stock or shopping payload is sent to OFF; the requested barcode is sent. Reading an external image exposes the browser IP and image path to OFF, without a Supabase token or referrer.

The Edge proxy supplies server-side User-Agent identification and a project-wide budget, at the cost of an invocation and Auth/RLS/budget calls per uncached unknown lookup. Each instance has bounded in-memory public metadata caches, not a shared public catalogue mirror.

## Validation and fallback

Codes are strings of 4–32 digits, independently of stricter camera recognition. JSON identity/structure and lengths are checked on both sides; optional invalid fields are dropped. Limit the incoming barcode request to 128 bytes and the streamed OFF body to 100,000 bytes. Structured package quantities can be mapped (for example 6 × 125 g means 750 g per stock package); ambiguous quantities remain editable instead of guessed. Multipack units do not become inventory count.

Unknown lookup suspends detection, retaining the camera stream. Manual entry is immediately available. Returned fields remain editable and require a name; no creation until validation. Closing/leaving/background/manual entry prevents late responses from overwriting a form. Missing products, invalid responses, network failure and exhausted budgets all retain manual fallback. No automatic upstream retry.

Timeouts are bounded at provider (4.5 s), handler (5.5 s), frontend fetch (6 s) and coordinator fallback (6.5 s). Positive metadata lives for 24 h, missing results for 10 min, with at most 200 provider/100 browser entries. Errors are not cached as product results in the current implementation.

## Budget and identification

The database gate allows one slot every six seconds across the project, independent of Edge isolate restarts. This is a conservative application policy, not a promised OFF quota. An Edge call claims a slot even if that isolate has cached metadata; known personal codes and browser metadata hits avoid the Edge entirely.

An occupied slot returns a `cooldown` with the actual remaining delay. Upstream 429 returns `rate-limit`, honoring Retry-After seconds/date (60 s fallback if invalid/missing, capped at 24 h; the six-second internal policy still applies). A failed attempt to persist that shared cooldown is not represented as a confirmed write. Network/budget failures are distinct from provider rate limiting. The local indicator counts down known delays without polling the server or claiming a globally remaining quota.

**Independent operator limitation:** the current provider validates the exact `App_reserve/<version> (https://github.com/Khaoseon)` User-Agent pattern. Changing the string in the Edge Function alone disables lookups. Before using a different operator identity, deliberately adapt that validator and its tests together with the Edge header, then review OFF usage identification/registration. This is not yet a configurable setting; no such code change is included in Phase 6B2. Inspect [the provider](../src/productLookupServer.ts) and [Edge entry point](../supabase/functions/product-lookup/index.ts).

Keep platform JWT verification enabled for deployment and allow exact intended frontend origins only. Local `functions serve --no-verify-jwt` is a test setup for invalid-token paths; the handler still checks Auth. Do not carry that flag into hosted configuration.

## Data, images and licenses

Open Food Facts and its contributors provide the external metadata. Its [official reuse guide](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/) distinguishes the database (ODbL 1.0), individual contents (DbCL 1.0) and images (CC BY-SA 3.0). Project MIT licensing does not relicense them. [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) links the license texts.

The app retains source barcode/image URL, product-source links, contributor attribution and license links. Images must be HTTPS under `images.openfoodfacts.org/images/products/`, with no query, credentials, alternate port or traversal. Files are shown whole, without rewriting/cropping; failure falls back to an icon. No OFF image is vendored in the repository or stored in Supabase. Shared private photo Storage is not implemented.

Exports retain provenance, not image bytes. Public reuse of a derived database can have attribution/share-alike/access obligations; a private login is not a general exemption. Personal quantities/accounts remain separate and are never contributed to OFF. Packaging graphics and trademarks can involve additional rights. Consult the upstream terms before distributing data/images; do not label an enriched catalogue wholly MIT.

Check [current API usage guidance](https://openfoodfacts.github.io/openfoodfacts-server/api/) before deployment instead of treating historical quota/cost figures as guarantees. Operator usage registration remains manual. Tests use mocks or rejected local requests and are not a license to send bulk production lookups. See [TESTING.md](TESTING.md).
