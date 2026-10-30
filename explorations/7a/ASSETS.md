# Synthetic imagery for the 7A exploration

`assets/pasta.png`, `tomato.png`, `oil.png` and `chickpea.png` were generated with the built-in ImageGen tool for this local design exploration. No private pantry photo, live OFF image, real manufacturer packshot or external font was downloaded. Names/brands are fictional fixture content. These are not reference photographs of products the application can recognize.

The original generated PNGs are retained here, approximately 8.1 MB total. This intentionally unoptimized review set is excluded from production builds. Any production image pipeline should generate measured responsive derivatives and thumbnails with an explicit byte budget; do not treat these PNG sizes as the performance target.

The mascot import points to the existing, unchanged `public/icon-192.png`. Author **Eloane ROURE**, [original MIT notice](../../assets/branding/LICENSE). It is used in empty states/credits, without tracing, redrawing or replacement. Icons use the existing `lucide-react` dependency and its existing project notices. Typography uses local system fonts.

## Exact prompt set

Each asset used the following prompt with its subject substituted for `{SUBJECT}`:

> Use case: product-mockup. Asset: synthetic sample photo for a local pantry UX prototype, no real brand. Premium editorial studio photograph of ONE {SUBJECT}. Perfectly frontal, entire package visible, centered, package occupies 72 percent of a square composition, warm ivory seamless background #f3f0e9, soft grounded shadow, diffuse morning light, highly realistic tactile materials, understated French grocery packaging with simple fictional label. No props, no other products, no watermark, no border.

| File                  | Subject substitution                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/pasta.png`    | matte cobalt-blue and cream paper bag with a small clear window of golden rigatoni pasta. Fictional label 'MAISON BLEUE' and 'RIGATONI'                 |
| `assets/tomato.png`   | clear glass jar of red tomato passata, dark red metal lid, warm cream paper label with a tomato drawing, fictional text 'LES BEAUX JOURS' and 'TOMATES' |
| `assets/oil.png`      | slender dark olive green glass bottle of olive oil with black cap, pale chartreuse minimalist label 'OLIVE' and fictional name 'SOLÉA'                  |
| `assets/chickpea.png` | short clear glass jar filled with chickpeas, silver lid, dusty pink cream label, fictional text 'ATELIER' and 'POIS CHICHES'                            |

Generated output is displayed with CSS contain-fit and a neutral image surface. Generation does not guarantee every packaging letter or requested colour was reproduced exactly. These images have no OFF attribution because they are not OFF content. The unchanged original mascot retains its separate artwork attribution/licence.
