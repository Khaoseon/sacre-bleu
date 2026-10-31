# Licensing and third-party materials

## Project scope and artwork

[LICENSE](LICENSE) applies to project code and documentation under the maintainers' control. Copyright attribution uses the maintainer's public GitHub handle, not an inferred legal name. Dependency licenses, external data/images and contributed artwork rights remain separate. Private instance data is not made public or licensed by publishing source code.

The mascot, original source and derived PNGs are by **Eloane ROURE**, redistributed under their separate [MIT artwork notice](assets/branding/LICENSE). The maintainer confirms permission for MIT redistribution of the original and derivatives and approves this public credit. Copyright remains with the creator; the project's code notice does not replace it. [Branding provenance and exact affected files](assets/branding/README.md) record this confirmation without publishing private correspondence.

## Software actually redistributed

The frontend bundles React/React DOM and scheduler (MIT), Supabase browser SDK modules and iceberg-js (MIT), ZXing Browser (MIT), ZXing JS (Apache-2.0), ts-custom-error (MIT), tslib (0BSD), and Lucide icons (ISC, with MIT Feather-derived artwork). The PWA additionally emits Workbox runtime code (MIT), idb (ISC), Babel helpers (MIT) and the AMD loader from @trickfilm400/rollup-plugin-off-main-thread (Apache-2.0), even though their build path starts with development dependencies.

[Complete versioned copyright and license texts](public/THIRD_PARTY_NOTICES.txt) are generated from the installed locked packages. This includes the ZXing license's additional notices, the Lucide/Feather attribution, and tslib's separate copyright file. They are copied by Vite to `/THIRD_PARTY_NOTICES.txt` in both local and Cloud builds. Keep this file when distributing the built application; minified banner comments alone are insufficient attribution.

```sh
npm ci
npm run notices:generate
npm run notices:check
```

The generator uses a reviewed list of 26 browser/worker/Edge packages and emitted-helper sources, not every tool in `node_modules`. On dependency or PWA changes, review the actual output/runtime imports and adjust that list; the check detects version/text drift, not new unlisted imports. The unused ZXing text-encoding dependency and workbox-window are not in the emitted bundles and are excluded. Build/test/CLI tools such as Vite, TypeScript, Vitest, Playwright and Supabase CLI are not deployed site code; they retain their package licenses when installed through npm. No extra license-scanner dependency or build service is required.

The private-photo Edge processor additionally redistributes jpeg-js 0.4.4 (Apache-2.0 decoder and BSD-style Adobe encoder notices). It is pinned as a development dependency for local processor tests and as an npm import in the Edge function, and is absent from the browser bundle.

## Production fonts

The application also distributes local Fraunces regular and Manrope regular/semibold WOFF2 files under SIL OFL 1.1. Their complete copyright and licence notices ship at `public/fonts/Fraunces-OFL.txt` and `public/fonts/Manrope-OFL.txt`. See [font provenance and conversion](src/assets/fonts/README.md). These are independent of the generated software dependency notices above.

## Open Food Facts

Open Food Facts and its contributors provide optional metadata and external images, not bundled project assets. The [official reuse guide](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/) identifies these separate terms:

| Material                     | License                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Database                     | [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/)                    |
| Individual database contents | [Database Contents License 1.0](https://opendatacommons.org/licenses/dbcl/1-0/)                |
| Product images               | [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |

The application preserves contributor attribution, source and license links. User exports preserve OFF provenance and image URLs, not image bytes. MIT does not replace those terms; derived database publication may carry additional obligations. Packaging designs, brands and trademarks may have separate rights. No third-party product images are vendored for the README. See [the integration guide](docs/OPEN_FOOD_FACTS.md) for data flow, image privacy, attribution and operator responsibilities.

A temporary sourcemap build identified 23 runtime package sources; inspection of Workbox's build path additionally identified the emitted Babel helper and AMD loader. Sourcemaps are not shipped by the normal build. All 481 locked package entries declare licenses; build-only dependency licenses (including MPL-2.0 tooling) do not relicense application output. Dependency texts were reviewed from the installed lockfile packages during Phase 6B2; the OFF primary reuse guide and GitHub security-reporting documentation were checked on 30 October 2026. This is an inventory of this distribution, not a claim of legal clearance for all future data reuse.
