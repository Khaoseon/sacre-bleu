# Image and font assets for the 7A / 7A.1 exploration

`assets/pasta.png`, `tomato.png`, `oil.png` and `chickpea.png` were generated with the built-in ImageGen tool for this local design exploration. The original four-fixture 7A set used no private pantry photo or real manufacturer image. The 7A.1 additions below are a separate, explicitly attributed offline review set. Names/brands are fictional fixture content. These are not reference photographs of products the application can recognize.

The original generated PNGs are retained here, approximately 8.1 MB total. This intentionally unoptimized review set is excluded from production builds. Any production image pipeline should generate measured responsive derivatives and thumbnails with an explicit byte budget; do not treat these PNG sizes as the performance target.

The mascot import points to the existing, unchanged `public/icon-192.png`. Author **Eloane ROURE**, [original MIT notice](../../assets/branding/LICENSE). It is used in empty states/credits, without tracing, redrawing or replacement. Icons use the existing `lucide-react` dependency and its existing project notices. The refinement adds locally hosted Fraunces and Manrope under their included SIL Open Font License notices.

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

## 7A.1 mixed-image fixtures

Two public OFF image snapshots were fetched once on 30 October 2026. No image or API request is made to OFF at prototype runtime. Product names are provider text. The image contributor and licence appear on the corresponding detail view; data provenance remains separate from a personal override.

| Local file                         | Original source / contributor                                                                                                                                                                                                  | Treatment                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `assets/reality/3017620422003.jpg` | [Nutella source](https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg), selected imgid 180, org-ferrero-france-commerciale; [product](https://world.openfoodfacts.org/product/3017620422003) | Original white-background 400 px snapshot; also reused as an explicitly deliberate CSS crop test. Binary not edited. |
| `assets/reality/5449000000996.jpg` | [Coca-Cola Original source](https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.1129.200.jpg), selected imgid 270, zeynepozturk11; [product](https://world.openfoodfacts.org/product/5449000000996)     | Narrow, low-resolution 75 × 200 px can; original binary.                                                             |

Images: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), Open Food Facts and the credited contributors; provider data: [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). The source snapshots retain their original colours with normal compositing; no global multiply or stock-dependent colour filter. The crop case changes CSS presentation, is labelled in provenance and is not represented as an intact packshot. Missing/failed-image fixtures intentionally exercise the fallback and use no third-party image.

`assets/reality/personal-lentils.png` was generated with the built-in ImageGen tool, without a private reference image. It is a fictional personal-photo example, not household data. Exact prompt:

> Use case: photorealistic-natural. Asset: fictional personal product photo for a local pantry prototype stress test. A single small glass jar of loose dried lentils with a plain handwritten French paper label 'Lentilles', resting on a real kitchen counter. Ordinary imperfect smartphone snapshot, slightly tilted perspective, uneven warm indoor light, patterned backsplash slightly visible, fingers and people absent. Portrait square framing, entire jar visible but off center with ample countertop. No polished studio background, no real brand, no personal information, no logo, no watermark. Realistic honest household photo, not a product advertisement.

## Locally served fonts

- `assets/fonts/Fraunces-400.ttf`: Fraunces Project Authors / Undercase Type, display regular, [included SIL OFL 1.1](assets/fonts/Fraunces-OFL.txt), [upstream](https://github.com/google/fonts/tree/main/ofl/fraunces). Google Fonts CSS source identified version v38.
- `assets/fonts/Manrope-400.ttf` and `Manrope-600.ttf`: Manrope Project Authors, regular and semibold, [included SIL OFL 1.1](assets/fonts/Manrope-OFL.txt), [upstream](https://github.com/google/fonts/tree/main/ofl/manrope). Google Fonts CSS source identified version v23.

Original font binaries are unchanged and retain their names. About 264 KB combined. Font display uses swap, with serif/system-sans fallbacks. The source request was `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&family=Manrope:wght@400..700&display=swap`; only the three selected static files are bundled. No Google Fonts stylesheet or network request is used by the prototype. These assets and licence files remain outside normal production output.
