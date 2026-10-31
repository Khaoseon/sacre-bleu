# Production typefaces

Fraunces 400 and Manrope 400/600 are lossless WOFF2 conversions of the approved [7A source fonts](../../../explorations/7a/assets/fonts). Copyright and SIL OFL 1.1 notices are redistributed unchanged in [public/fonts](../../../public/fonts), which Vite copies into production output. Original names, glyph repertoire, font tables and static weights are retained; no subset, renamed typeface or synthetic weight range is introduced.

The three files total **92,044 bytes**, versus **264,128 bytes** for the source TTFs (65% smaller). Conversion uses FontTools 4.63.0 and Brotli 1.2.0 as temporary authoring tools, with no application dependency. To reproduce in a Python environment containing those versions, run from the repository root:

```python
from pathlib import Path
from fontTools.ttLib import TTFont

for source in Path('explorations/7a/assets/fonts').glob('*.ttf'):
    font = TTFont(source)
    font.flavor = 'woff2'
    font.save(Path('src/assets/fonts') / (source.stem + '.woff2'))
```

The CSS declares only actual weights: Manrope 400/600, Fraunces 400. `font-display: swap` and local system fallbacks preserve readable content. Fonts are fetched only when used, hashed by Vite and precached by the existing WOFF2 app-shell rule; there is no remote font stylesheet, preload or third-party request. Full source coverage preserves arbitrary supported user/provider text, including French accents and English, without an ASCII-only subset.
