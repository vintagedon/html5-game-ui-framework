<!--
---
title: "Foundations Review 2026-08-02"
description: "Closed approval questions for the token contract, state recipes, source boundary, compatibility floor, and zero-raster spike"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.1"
status: "Approved"
tags:
  - type: report
  - domain: foundations
  - tech: [css, html, javascript, svg]
related_documents:
  - "[Token Reference](token-reference.md)"
  - "[Project Charter](project-charter.md)"
  - "[Phase 1 Reference Surface](../reference/README.md)"
---
-->

# Foundations Review 2026-08-02

This is the operator approval surface for Phase 1. Each finding states what the
executor found, points to evidence, and ends at a closed decision. It records
questions rather than deciding them. Phase 2 does not dispatch until F-002 has
an operator answer.

## F-001: Semantic Vocabulary Freeze Candidate

Statement: One hue-neutral and domain-neutral semantic vocabulary populated all
four themes without a Gate 1.5 addition. Amendment 1 added one token
(`--gc-focus-width`, A1.4) so Core stops reading a primitive; the count is now
83 and the addition is hue-neutral and domain-neutral. No other change to the
vocabulary.

Evidence: `src/tokens/semantic.css` declares the vocabulary,
`docs/token-reference.md` defines the tier contract, and every file under
`src/themes/` declares exactly this token set. The denylist and its deliberate
`--gc-mana-fill` mutation both discriminated correctly.

### Full vocabulary and boundaries

| Token | Boundary definition |
|-------|---------------------|
| `--gc-surface-canvas` | Page or playfield-adjacent ground; not a contained panel. |
| `--gc-surface-base` | Default content plane; not an elevated or recessed plane. |
| `--gc-surface-raised` | Plane visually above the base; not a modal stacking instruction. |
| `--gc-surface-sunken` | Recessed well or track; not an interactive state colour. |
| `--gc-surface-interactive` | Resting fill for an actionable control; not hover or active fill. |
| `--gc-surface-overlay` | Opaque content plane above ordinary layout; not its scrim. |
| `--gc-surface-texture` | Generated texture layered onto a surface; not a raster asset URL. |
| `--gc-surface-backdrop-filter` | Treatment behind a translucent surface; not a foreground filter. |
| `--gc-surface-shape` | Outer surface geometry; not spacing or border radius. |
| `--gc-surface-edge-filter` | Optional procedural edge distress; not colour correction. |
| `--gc-ornament-color` | Colour for generated ornament; not the global accent contract. |
| `--gc-ornament-mask` | Generated vector decorative mask; not content imagery. |
| `--gc-ornament-opacity` | Visibility of optional ornament; not disabled-control opacity. |
| `--gc-text-primary` | Highest-emphasis ordinary text; not text on an accent fill. |
| `--gc-text-secondary` | Supporting readable text; not placeholder or disabled text. |
| `--gc-text-muted` | Low-emphasis metadata and hints; not an inaccessible decoration. |
| `--gc-text-inverse` | Text on a generally inverted surface; not specifically on accent. |
| `--gc-text-disabled` | Text for unavailable controls; not muted available content. |
| `--gc-border-default` | Ordinary component boundary; not focus or selection. |
| `--gc-border-strong` | Emphasized structural boundary; not an error state. |
| `--gc-divider` | Separator between adjacent regions; not an enclosing border. |
| `--gc-border-width` | Theme-level structural stroke width; not component geometry. |
| `--gc-accent` | Primary emphasis and action colour; not a named hue or status. |
| `--gc-on-accent` | Legible foreground on accent; not general inverse text. |
| `--gc-focus-ring` | Keyboard focus indicator colour; not hover or selected colour. |
| `--gc-focus-width` | Keyboard focus indicator stroke width; not a generic border width. |
| `--gc-focus-offset` | Space between focus ring and target; not layout spacing. |
| `--gc-status-success` | Positive completion or healthy state; not resource gain. |
| `--gc-on-status-success` | Foreground on success fill; not success-adjacent text. |
| `--gc-status-warning` | Caution requiring attention; not rarity or tier. |
| `--gc-on-status-warning` | Foreground on warning fill; not general dark text. |
| `--gc-status-danger` | Error, destructive, or critical state; not a combat mechanic. |
| `--gc-on-status-danger` | Foreground on danger fill; not general inverse text. |
| `--gc-status-info` | Neutral informational state; not the framework accent. |
| `--gc-on-status-info` | Foreground on info fill; not general inverse text. |
| `--gc-disabled-opacity` | Opacity reduction for unavailable UI; not a disabled colour recipe. |
| `--gc-overlay-fill` | Fill of an overlay plane; not its page-blocking scrim. |
| `--gc-scrim-fill` | Backdrop separating modal content; not overlay content. |
| `--gc-elevation-none` | Explicit absence of depth; not a transparent shadow. |
| `--gc-elevation-low` | Depth for locally raised controls; not a modal stack level. |
| `--gc-elevation-mid` | Depth for floating panels; not a z-index value. |
| `--gc-elevation-high` | Depth for modal emphasis; not DOM reordering. |
| `--gc-radius-control` | Default control corners; not a circle guarantee. |
| `--gc-radius-panel` | Default container corners; not layout spacing. |
| `--gc-radius-round` | Fully rounded geometry; not a fixed size. |
| `--gc-space-1` | First compact internal spacing step; not a border width. |
| `--gc-space-2` | Second small spacing step; not a typography measure. |
| `--gc-space-3` | Third control-padding step; not a control height. |
| `--gc-space-4` | Fourth ordinary layout step; not viewport padding. |
| `--gc-space-5` | Fifth grouped-region step; not a breakpoint. |
| `--gc-space-6` | Sixth section-separation step; not page width. |
| `--gc-space-7` | Seventh large-composition step; not a viewport unit. |
| `--gc-space-8` | Eighth major-separation step; not a maximum. |
| `--gc-font-body` | Family for paragraphs, labels, and controls; not display ornament. |
| `--gc-font-display` | Family for prominent headings; not all text. |
| `--gc-font-code` | Family for machine-readable values; not body copy. |
| `--gc-type-caption-size` | Compact metadata size; not disabled text. |
| `--gc-type-body-size` | Default readable size; not a browser zoom target. |
| `--gc-type-label-size` | Control and field-label size; not heading text. |
| `--gc-type-title-size` | Section-heading size; not the page display size. |
| `--gc-type-display-size` | Responsive strongest-heading size; not ordinary titles. |
| `--gc-type-body-weight` | Default body emphasis; not a synthesized style. |
| `--gc-type-label-weight` | Label and control weight; not title emphasis. |
| `--gc-type-title-weight` | Heading weight; not a universal bold token. |
| `--gc-type-body-line-height` | Leading for readable copy; not layout spacing. |
| `--gc-type-heading-line-height` | Compact heading leading; not body leading. |
| `--gc-type-label-tracking` | Label letter spacing; not uppercase transformation. |
| `--gc-type-title-tracking` | Heading letter spacing; not label tracking. |
| `--gc-type-label-transform` | Label case treatment; not source-text mutation. |
| `--gc-motion-instant` | No-duration state change; not reduced-motion policy. |
| `--gc-motion-fast` | Direct-manipulation feedback; not a decorative sequence. |
| `--gc-motion-base` | Default component transition; not a timeout. |
| `--gc-motion-slow` | Deliberate entrance or large transition; not indefinite animation. |
| `--gc-easing-standard` | General state curve; not entrance-only easing. |
| `--gc-easing-enter` | Curve for entering content; not exit motion. |
| `--gc-easing-exit` | Curve for leaving content; not entrance motion. |
| `--gc-easing-stepped` | Discrete theme motion; not low-frame-rate animation. |
| `--gc-z-base` | Ordinary document stacking plane; not a CSS layer. |
| `--gc-z-raised` | Locally raised chrome plane; not an overlay. |
| `--gc-z-overlay` | Non-modal overlay plane; not a modal dialog. |
| `--gc-z-modal` | Modal interaction plane; not a shadow recipe. |
| `--gc-z-toast` | Notification plane above modal content; not DOM order. |
| `--gc-image-rendering` | Theme preference for pixel-like content; not an asset type. |

Question: Approve this vocabulary as frozen, yes or no?

## F-002: Zero-Raster Verdict

Statement: The fantasy spike renders its texture, ornament, inset edge, and
irregular silhouette with text techniques and no runtime image file.

Evidence:

| Effect | Technique | Result |
|--------|-----------|--------|
| Procedural parchment or stone | SVG data URI with `feTurbulence`, desaturation, and a generated wash | Rendered in Chromium |
| Filigree corner | Original SVG path in a data-URI `mask-image` | Rendered in Chromium |
| Embossed inset | Six layered inset and outer `box-shadow` entries | Rendered in Chromium |
| Irregular edge | Inline `feDisplacementMap` plus a weathered `clip-path` polygon | Rendered in Chromium |

Extension scans across the declared source paths returned zero raster files and
zero archives. The reference page made thirteen same-origin HTTP requests and
zero off-origin requests. No spike effect has a named failure.

Question: Does the zero-raster position hold, yes or no?

## F-003: Gate 1.5 Vocabulary Gaps

Statement: Arcade, sci-fi, and fantasy required new primitive values but no new
semantic role.

Evidence: Each theme declaration-name set equals the declaration-name set in
`src/tokens/semantic.css`. New grid, scanline, parchment, ornament, shape, and
shadow literals remain internal primitives selected through existing semantic
roles.

Question: Accept that Gate 1.5 requires no semantic-token addition, yes or no?

## F-004: State-Derivation Recipes

Statement: One component-tier OKLCH recipe supplies each of hover, active,
disabled, and selected fill under all themes.

Evidence:

| State | Recipe |
|-------|--------|
| Hover | `color-mix(in oklch, var(--gc-surface-interactive) 84%, var(--gc-accent))` |
| Active | `color-mix(in oklch, var(--gc-surface-interactive) 70%, var(--gc-accent))` |
| Disabled | `color-mix(in oklch, var(--gc-surface-interactive) 72%, var(--gc-surface-canvas))` |
| Selected | `color-mix(in oklch, var(--gc-accent) 82%, var(--gc-surface-base))` |

Chromium computed five distinct modern button fills, and the button and input
shared the same disabled fill. The reference surface presents the same states
under all themes. Fantasy intentionally makes disabled states very subdued;
arcade makes hover-to-active change short and stepped. Those two readings need
operator confirmation rather than per-theme state overrides.

Question: Choose **accept the four recipes** or **reopen state derivation**.

## F-005: Framework Source and Metric Boundary

Statement: Framework and theme publication scope resolves to four directories.

Evidence: Gate 1.6 raster and archive scans, and the Phase 2 computed metrics,
cover exactly:

```text
src/tokens/
src/core/
src/modules/
src/themes/
```

`src/modules/` is intentionally empty except for its interior README until a
consumer forces a module. The boundary excludes `assets/`, `docs/`,
`internal-files/`, `reference/`, `staging/`, `recycle-bin/`, and every
`reference-files-*` tree. The reference page is a review harness rather than
published framework source.

Question: Approve these four directories as the framework scan boundary, yes or no?

## F-006: Browser Compatibility Audit

Statement: The authored features meet the frozen floor on published support
data when the standard and prefixed WebKit mask/backdrop declarations are
treated as one compatibility pair. Only Chromium 145 was rendered on ML01.

Evidence: The audit uses the charter's floor, Chrome and Edge 111, Safari 16.4,
and Firefox 128. Support assertions were checked on 2026-08-03 against browser
vendor documentation and the MDN browser-compatibility dataset. “Observed”
means the feature rendered in ML01 Chromium 145; Safari, Firefox, Edge 111, and
Chrome 111 were not run on this host.

| Feature used | Floor status | Evidence posture |
|--------------|--------------|------------------|
| CSS custom properties and `var()` | Supported below all floor versions | Observed Chromium; asserted elsewhere |
| Cascade layers and `:where()` | Supported below all floor versions | Observed Chromium; asserted elsewhere |
| `oklch()` colour | Chrome/Edge 111, Safari before 16.4, Firefox 113 | Observed Chromium; asserted Safari and Firefox |
| `color-mix(in oklch, ...)` | Chrome/Edge 111, Safari 16.2, Firefox 113 | Observed Chromium; asserted Safari and Firefox |
| Radial, repeating-linear, and conic gradients | Supported below all floor versions | Observed Chromium; asserted elsewhere |
| `clip-path: polygon()` | Supported below all floor versions | Observed Chromium; asserted elsewhere |
| CSS `filter: url(#...)` on HTML | Supported below all floor versions, with known engine rendering differences | Observed Chromium; asserted elsewhere |
| SVG `feTurbulence`, `feColorMatrix`, and `feDisplacementMap` | Widely supported since 2015 or earlier | Observed Chromium; asserted elsewhere |
| SVG data URIs as CSS images | Supported below all floor versions over HTTP | Observed Chromium; asserted elsewhere |
| `mask-image`, position, repeat, and size | Safari 15.4 and Firefox below floor; Chrome standard form reaches full support after 111 | Standard and `-webkit-` forms are paired; observed current Chromium only |
| `backdrop-filter` | Chrome and Firefox support standard form below floor; Safari 16.4 requires `-webkit-backdrop-filter` | Both forms are authored; variable-driven Safari 16.4 rendering is asserted, not observed |
| Logical sizing/inset properties, Grid, Flexbox, `clamp()`, `isolation` | Supported below all floor versions | Observed Chromium; asserted elsewhere |
| `image-rendering: pixelated` | Supported below all floor versions | Observed as a computed value; no raster content was supplied |
| ESM scripts and `dataset` root switching | Supported below all floor versions | Observed Chromium; asserted elsewhere |

Primary compatibility references:

- [Chrome color-mix support](https://developer.chrome.com/docs/css-ui/css-color-mix)
- [WebKit features in Safari 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)
- [WebKit unprefixed masks in Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/)
- [MDN browser-compatibility data](https://github.com/mdn/browser-compat-data)
- [MDN feDisplacementMap support](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap)
- [MDN backdrop-filter support](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)
- [MDN mask-image support](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask-image)

Compatibility caveat: the only floor-sensitive implementation detail is the
prefixed Safari 16.4 backdrop path with a custom-property value. The standard
declaration remains authoritative for current engines, and sci-fi retains an
opaque readable surface if the blur is ignored. This is a visual enhancement
gap rather than loss of content or interaction, but it has not been rendered on
Safari 16.4 here.

Question: Choose **accept the frozen floor as met with the prefixed
compatibility pair** or **treat mask/backdrop technique as out of bounds**.

## Amendment 1 (2026-08-03)

Amendment 1 repaired six findings from independent review of the open pull
request. Two of them change what F-002 and F-006 describe; one adds a semantic
token to F-001; and the accessibility measurement mandated by A1.5 surfaced a
new finding (F-007) that the original review surface did not carry. No charter
contradiction was confirmed.

| Finding | Amendment change |
|---------|------------------|
| F-001 | One new semantic token, `--gc-focus-width` (added by A1.4 so Core stops reading the `--gc-border-medium` primitive). Vocabulary count is 82 → 83; the table above now includes its boundary. Still hue-neutral and domain-neutral. Question stands. |
| F-002 | The fantasy spike still renders the four effects with zero raster files. The edge-distress technique changed rendering path: the `feDisplacementMap` filter defs now ship from framework ESM source (`src/gc.js` injects them on import) rather than relying on markup copied from `reference/`. A consumer loading only published source now gets the effect. (Correction to the amendment's prediction: Chromium 145 degrades rather than disappears when the reference is unresolvable — the panel renders without the displacement. The fix is still required because the effect must render from published source.) Verdict question stands. |
| F-006 | The sci-fi frost now actually renders. A1.6 made `--gc-surface-raised` translucent (`color-mix` at 0.72 alpha) under sci-fi with an `@supports` opaque fallback, so `backdrop-filter` composites real backdrop pixels. Measured interior backdrop bleed-through 0 → 40 over a high-contrast pattern, with text contrast held at 14.16:1. Compatibility question stands; no new feature was introduced outside the floor. |
| F-007 (new) | See below. |

### F-007: Theme token-value contrast defects (closed)

**Resolution.** The operator chose **adjust**, then decided the class rather
than the list: every semantic foreground/background pair meets 4.5:1 in every
theme. Amendments 2 and 3 fixed all four failing pairs the comprehensive sweep
found, by adjusting primitive palette values and two theme mappings. No semantic
token was added, renamed, or removed; the 83-token vocabulary and tier
boundaries are unchanged. Final ratios:

| Pair | Themes | Before | After |
|------|--------|--------|-------|
| `--gc-on-accent` / `--gc-accent` | modern | 3.60:1 | **8.24:1** |
| `--gc-on-accent` / `--gc-control-fill-selected` | modern | 2.74:1 | **5.33:1** |
| `--gc-on-status-danger` / `--gc-status-danger` | all four | 3.82:1 | **6.02:1** |
| `--gc-on-status-info` / `--gc-status-info` | all four | 2.62:1 | **6.17:1** |
| `--gc-text-muted` on surfaces | modern / fantasy | 2.88–3.70 | **6.01–6.91** |

axe-core color-contrast on the reference page reports **0 violations across all
four themes.** The full pair matrix (every semantic fg/bg pair, all four themes,
passes and the exempt/non-designed entries explained) is in the worklog's
Amendment 2 and Amendment 3 sections. Mutation tests re-surfaced each failure on
revert and were restored.

**Standing rule, set by Amendment 3 and recorded in `docs/token-reference.md`
as a property of the contract.** Every semantic foreground placed on every
semantic surface meets WCAG AA (4.5:1) at the framework's default body and
caption sizes, in every theme, with no size qualification. A future theme
inherits it. `--gc-text-disabled` is outside the rule (WCAG 1.4.3 exempts
inactive controls); `--gc-text-inverse` is outside it on non-inverted surfaces
(its boundary restricts it to inverted surfaces).

**Finding recorded, not acted on.** Enforcing 4.5:1 compresses the
muted–secondary lightness gap (modern: secondary L=34, muted L=46, gap 12 vs 31
before; fantasy: secondary L=82, muted L=70, gap 12 vs 24). The tiers stay
ordered and non-overlapping, but the separation is now re-earned through weight,
size, and spacing rather than lightness alone — the `--gc-text-muted` boundary
says so. That the tiers are visually close after 4.5:1 is a vocabulary finding
for Phase 3's consumer-pressure work, not a defect here.

No pair is carried forward. This finding is closed.

## Review Summary

Operator decisions recorded 2026-08-03. The vocabulary is frozen as of this
date; `docs/token-reference.md` carries the same status. Phase 2 is unblocked.

| Finding | Operator decision | Consequence |
|---------|-------------------|-------------|
| F-001 semantic vocabulary | **Approved, frozen** | The 83-token vocabulary is API. Renaming a semantic token is a major version from here. Spec-02 binds scenarios to these names and does not renegotiate them. |
| F-002 zero-raster position | **Holds** | The charter's central technical position is confirmed against the theme that decides it. No charter change. |
| F-003 no Gate 1.5 semantic addition | **Approved** | The vocabulary was sufficient for four themes without a forced addition, which is the evidence F-001 rests on. |
| F-004 state recipes | **Accepted** | Hover, active, disabled, and selected stay derived through `color-mix()` in OKLCH. Themes populate base tokens only. |
| F-005 source boundary | **Approved** | `src/tokens/`, `src/core/`, `src/modules/`, `src/themes/` are the framework scan boundary. `reference/` is a review harness and is excluded, so page chrome never inflates a size metric. Spec-02 Gate 2.6 resolves against this list. |
| F-006 compatibility floor | **Accepted with the prefixed pair** | Standard and `-webkit-` mask and backdrop declarations count as one compatibility unit. The unrendered Safari 16.4 prefixed backdrop path stays a known gap: the failure mode is a missing visual enhancement over a readable opaque surface, not lost content or interaction. Verify whenever a Safari host is convenient. |
| F-007 theme token-value contrast | **Closed (Amendments 2 + 3)** | All four failing pairs the comprehensive sweep found (modern accent, danger, info, muted) now pass at 8.24 / 5.33 / 6.02 / 6.17 / 6.01–6.91. axe-core reports 0 violations across all four themes. The standing 4.5:1 rule is recorded in `docs/token-reference.md` as a property of the contract. No pair is carried forward. |

**Why F-007 was not accepted as a known issue.** The modern accent pair at
2.73:1 misses the 3:1 threshold for UI components, not only the 4.5:1 text
threshold, so it is not a marginal miss. The charter freezes vocabulary and
leaves values tunable to v1.0, so the fix is in bounds and cheap today and
expensive later. And spec-02 builds a metrics block whose whole property is
that its numbers are true at build time or visibly false; an accessibility
failure count that ships with a standing accepted exception is a number
everyone learns to skip. This is the first figure that block will ever report.

**The spec is closed.** Every finding above shows a resolution; no item is
carried forward. Amendments 1, 2, and 3 are complete on the branch, unpushed,
awaiting operator review and merge.

Confirmed charter contradictions: None. F-006 records a prefixed-property
compatibility caveat for operator judgment without changing the charter.
Amendments 1–3 adjusted primitive palette values and theme mappings, which the
charter permits (values tunable to v1.0), and recorded one standing rule
(4.5:1 contrast) as a property of the token contract, without changing the
charter or the frozen vocabulary.
