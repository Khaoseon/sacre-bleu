# Final aesthetic review · 7A.2

The maintainer selects A photographic shelf by default, B compact inventory as a manual alternative, and A object detail. This supersedes the earlier list-default recommendation. No 7B, production behavior, hosting or backend changes.

Cards retain generous contain-fit imagery. Names and essential package information share a row when space allows; long names wrap naturally, with package information below. Brand is removed only from shelf cards and remains in details and name/brand/barcode search. Normal rows omit redundant status spacing; low/zero warnings remain visible. All quantity targets remain 44px. At 320×568, two ordinary cards and their complete quantity controls fit initially. Long names intentionally grow and may require scrolling.

The second shelf variant puts package information underneath the name: [try it locally](http://127.0.0.1:5197/?layout=shelf&shelf=stacked). Recommend the inline-package variant for its clearer grouping and reduced height. The compact inventory toggle remains available.

Object detail retains its large photograph, tighter stock/action spacing and a quieter 18px close icon inside a 44px target. Initial focus goes to the product title; keyboard focus on Close remains visible.

| Width   | Before shelf                       | Inline shelf                     | Second variant                       | Mixed photos                     | Long name                      | Low stock                    | Before detail                              | Detail                            |
| ------- | ---------------------------------- | -------------------------------- | ------------------------------------ | -------------------------------- | ------------------------------ | ---------------------------- | ------------------------------------------ | --------------------------------- |
| 320x568 | [Before](before-shelf-320x568.png) | [After](after-shelf-320x568.png) | [Variant](after-variant-320x568.png) | [Mixed](after-mixed-320x568.png) | [Long](after-long-320x568.png) | [Low](after-low-320x568.png) | [Before](before-detail-object-320x568.png) | [After](after-detail-320x568.png) |
| 375x812 | [Before](before-shelf-375x812.png) | [After](after-shelf-375x812.png) | [Variant](after-variant-375x812.png) | [Mixed](after-mixed-375x812.png) | [Long](after-long-375x812.png) | [Low](after-low-375x812.png) | [Before](before-detail-object-375x812.png) | [After](after-detail-375x812.png) |
| 430x932 | [Before](before-shelf-430x932.png) | [After](after-shelf-430x932.png) | [Variant](after-variant-430x932.png) | [Mixed](after-mixed-430x932.png) | [Long](after-long-430x932.png) | [Low](after-low-430x932.png) | [Before](before-detail-object-430x932.png) | [After](after-detail-430x932.png) |

Local checks: 341 Vitest + 5 configuration tests; strict application/prototype typechecks, normal/prototype builds, formatting and whitespace checks passed. The complete seven-size browser matrix and F1–F9 interaction regressions passed; final focus/search changes also receive the interaction check. Physical Safari/iOS remains unverified. CI is launched by the PR push and is deliberately not a delivery gate for this review, as requested.

Previous mixed-image and long-name captures: [mixed 320x568](before-mixed-320x568.png) · [long 320x568](before-long-name-320x568.png) · [mixed 375x812](before-mixed-375x812.png) · [long 375x812](before-long-name-375x812.png) · [mixed 430x932](before-mixed-430x932.png) · [long 430x932](before-long-name-430x932.png).
