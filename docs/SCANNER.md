# Camera scanner

Current behavior; the [French phase-3 record](history/SCANNER_FR.md) preserves the original library comparison and device evidence. [TESTING.md](TESTING.md) separates implemented behavior from physical acceptance.

## Decoder and lifecycle

The project locks ZXing Browser 0.2.1 and ZXing JS 0.23.0. `src/scanner/decoder.ts` loads on explicit camera activation, in a separate same-origin chunk. It uses canvas/video and `getUserMedia`, not a mandatory native BarcodeDetector. The chunk is excluded from initial PWA precache and cached on first use. No CDN or frame upload.

`src/scanner/camera.ts` owns tracks; `CameraScanner.tsx` owns controls. Prefer rear-facing video with ideal 1920×1080, no audio, muted inline playback. Continuous focus is requested only when supported; browser lens selection is not guaranteed to match the phone's native 1× lens. A device-local camera preference is available after permission.

Detection pauses during a lookup, form or uncertain request without treating the pause as barcode withdrawal. Exit/background stops tracks and releases decoder/canvas resources. Foreground resumption is explicit. Denied permissions or unsupported capture leave manual entry available. Form closure/navigation/background invalidates pending product lookup results.

## Recognition and repeat intentions

Pure recognition rules are in `src/model.ts` and tested independently of optics:

1. Camera codes must contain exactly 8, 12 or 13 digits, pass the modulo-10 check and not be all zeroes. Never convert the whole code to a number.
2. Require at least three matching observations over at least 240 ms. A gap over 500 ms restarts stabilization; this is not a decoding-speed guarantee.
3. Lock the accepted code for as long as it continues to be read. A different stable code can be accepted immediately.
4. Re-arm the same code after at least five no-result observations spanning one second, then a new stabilization. Missing frames, a modal, network wait or mode change are not withdrawal observations.
5. An explicit repeat starts a new business intention and locks the presentation again.

Blur can resemble withdrawal; optical detection is not proof that the user physically removed a product. Use the counter/repeat command for identical packages. Manual entry retains its separate 1.2-second delay and explicit repeat action.

UPC-A at 12 digits and its leading-zero EAN-13 representation share one lock. Configure EAN-13/EAN-8 decoding so UPC bars retain the leading zero representation; catalogue search tries an exact match before that equivalence. Existing stored codes are never rewritten. Non-checksummed demo examples remain manual-entry examples, not camera validation evidence.

## Shared operation boundary

A local scanner identity is distinct from synchronized reserve snapshots. Polling cannot reinterpret a still-visible code as a fresh request. Known catalogue codes bypass OFF. Unknown codes open an editable form and use the existing create-at-zero then identified-scan path in Ajouter. Adjustments and undo retain the server-side version/revision checks described in [BACKEND.md](BACKEND.md).

The original phase-3 iPhone/Samsung core journey was exercised physically. Later browser simulations use synthetic video/decoders; they do not prove autofocus, all barcode formats, every lens or the historical substitution incident on real phones. No phone-speed benchmark is claimed. Historical physical matrices remain in [the documentation inventory](README.md).
