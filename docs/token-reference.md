<!--
---
title: "Semantic Token Reference"
description: "Freeze-candidate vocabulary and tier boundaries for framework tokens"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Under Review"
tags:
  - type: reference
  - domain: foundations
  - tech: [css]
related_documents:
  - "[Project Charter](project-charter.md)"
  - "[Foundations Review](foundations-review-2026-08-02.md)"
  - "[Token Source](../src/tokens/README.md)"
---
-->

# Semantic Token Reference

This document is the freeze candidate for the `--gc-` semantic vocabulary.
It remains **Under Review** until the operator approves finding F-001 in the
foundations review. That approval freezes names and boundaries; exact values
remain tunable through v1.0.

## 1. Tier Contract

| Tier | Holds | May reference | Consumer status |
|------|-------|---------------|-----------------|
| Primitive | Literal colour, dimension, type, motion, shape, and effect values | Nothing | Internal; framework rules never read it |
| Semantic | Roles shared by all themes and components | Primitive tokens only | Public freeze candidate; themes may override it |
| Component | Defaults and shared state recipes for a component | Semantic tokens only | Public where a component exposes it |

The dependency direction is primitive to semantic to component. A theme
populates semantic roles only. A component may consume semantic and component
tokens, but it never consumes a primitive.

## 2. Semantic Vocabulary

Each boundary says what the token means and what it does not mean. No name
presumes a hue, game mechanic, or one theme's technique.

### Surfaces and Ornament

| Token | Boundary definition |
|-------|---------------------|
| `--gc-surface-canvas` | Page or playfield-adjacent ground; not a contained panel. |
| `--gc-surface-base` | Default content plane; not an elevated or recessed plane. |
| `--gc-surface-raised` | Plane visually above the base; not a modal stacking instruction. |
| `--gc-surface-sunken` | Recessed well or track; not an interactive state colour. |
| `--gc-surface-interactive` | Resting fill for an actionable control; not its hover or active fill. |
| `--gc-surface-overlay` | Opaque content plane used above ordinary layout; not the surrounding scrim. |
| `--gc-surface-texture` | Generated texture layered onto a surface; not a raster asset URL. |
| `--gc-surface-backdrop-filter` | Compositing treatment behind a translucent surface; not a foreground effect. |
| `--gc-surface-shape` | Outer geometry applied to a surface; not spacing or border radius. |
| `--gc-surface-edge-filter` | Optional procedural distress of a surface edge; not colour correction. |
| `--gc-ornament-color` | Colour available to generated ornament; not the global accent contract. |
| `--gc-ornament-mask` | Generated vector mask for decorative marks; not content imagery. |
| `--gc-ornament-opacity` | Visibility of optional ornament; not control disabled opacity. |

### Text, Borders, and Accent

| Token | Boundary definition |
|-------|---------------------|
| `--gc-text-primary` | Highest-emphasis ordinary text; not text placed on an accent fill. |
| `--gc-text-secondary` | Supporting readable text; not placeholder or disabled text. |
| `--gc-text-muted` | Low-emphasis metadata and hints; not an inaccessible decorative tint. |
| `--gc-text-inverse` | Text on a generally inverted surface; not specifically text on accent. |
| `--gc-text-disabled` | Text for unavailable controls; not muted but available content. |
| `--gc-border-default` | Ordinary component boundary; not a focus or selected indicator. |
| `--gc-border-strong` | Emphasized structural boundary; not an error state. |
| `--gc-divider` | Separator between adjacent content regions; not an enclosing border. |
| `--gc-border-width` | Default theme-level structural stroke width; not component geometry. |
| `--gc-accent` | Primary emphasis and action colour; not a named hue or status. |
| `--gc-on-accent` | Legible foreground placed on the accent; not general inverse text. |
| `--gc-focus-ring` | Keyboard focus indicator colour; not hover or selected colour. |
| `--gc-focus-offset` | Space between a focus ring and its target; not layout spacing. |

### Status

| Token | Boundary definition |
|-------|---------------------|
| `--gc-status-success` | Positive completion or healthy state; not resource gain. |
| `--gc-on-status-success` | Foreground placed on the success fill; not success-adjacent text. |
| `--gc-status-warning` | Caution requiring attention; not a rarity or tier. |
| `--gc-on-status-warning` | Foreground placed on the warning fill; not general dark text. |
| `--gc-status-danger` | Error, destructive, or critical state; not a combat mechanic. |
| `--gc-on-status-danger` | Foreground placed on the danger fill; not general inverse text. |
| `--gc-status-info` | Neutral informational state; not the framework accent. |
| `--gc-on-status-info` | Foreground placed on the info fill; not general inverse text. |

### Availability, Overlay, and Elevation

| Token | Boundary definition |
|-------|---------------------|
| `--gc-disabled-opacity` | Opacity reduction for unavailable UI; not a disabled colour recipe. |
| `--gc-overlay-fill` | Fill of an overlay content plane; not the page-blocking scrim. |
| `--gc-scrim-fill` | Backdrop that separates modal content from the page; not overlay content. |
| `--gc-elevation-none` | Explicit absence of depth treatment; not a transparent shadow. |
| `--gc-elevation-low` | Depth for locally raised controls; not a modal stack level. |
| `--gc-elevation-mid` | Depth for floating panels; not a z-index value. |
| `--gc-elevation-high` | Depth for modal emphasis; not an instruction to reorder DOM. |

### Radius and Spacing

| Token | Boundary definition |
|-------|---------------------|
| `--gc-radius-control` | Default corner treatment for controls; not a circle guarantee. |
| `--gc-radius-panel` | Default corner treatment for containers; not outer layout spacing. |
| `--gc-radius-round` | Fully rounded geometry such as pills and circles; not a fixed size. |
| `--gc-space-1` | First spacing step for compact internal gaps; not a border width. |
| `--gc-space-2` | Second spacing step for small gaps; not a typography measure. |
| `--gc-space-3` | Third spacing step for control padding; not a control height. |
| `--gc-space-4` | Fourth spacing step for ordinary layout gaps; not viewport padding. |
| `--gc-space-5` | Fifth spacing step for grouped regions; not a breakpoint. |
| `--gc-space-6` | Sixth spacing step for section separation; not a page width. |
| `--gc-space-7` | Seventh spacing step for large composition gaps; not a viewport unit. |
| `--gc-space-8` | Eighth spacing step for major separation; not a maximum spacing value. |

### Typography

| Token | Boundary definition |
|-------|---------------------|
| `--gc-font-body` | Family for paragraphs, labels, and controls; not display ornament. |
| `--gc-font-display` | Family for prominent headings; not a mandate for all text. |
| `--gc-font-code` | Family for machine-readable values; not general body copy. |
| `--gc-type-caption-size` | Size for compact metadata; not disabled text. |
| `--gc-type-body-size` | Default readable text size; not a fixed browser zoom target. |
| `--gc-type-label-size` | Size for control and field labels; not heading text. |
| `--gc-type-title-size` | Size for section headings; not the page display size. |
| `--gc-type-display-size` | Responsive size for the strongest heading; not ordinary titles. |
| `--gc-type-body-weight` | Default body emphasis; not a browser-synthesized style. |
| `--gc-type-label-weight` | Weight for labels and controls; not title emphasis. |
| `--gc-type-title-weight` | Weight for headings; not a universal bold token. |
| `--gc-type-body-line-height` | Leading for readable copy; not vertical layout spacing. |
| `--gc-type-heading-line-height` | Compact leading for headings; not body leading. |
| `--gc-type-label-tracking` | Letter spacing for labels; not a transform to uppercase. |
| `--gc-type-title-tracking` | Letter spacing for headings; not label tracking. |
| `--gc-type-label-transform` | Case treatment for labels; not source-text mutation. |

### Motion and Stacking

| Token | Boundary definition |
|-------|---------------------|
| `--gc-motion-instant` | No-duration state change; not a reduced-motion preference switch. |
| `--gc-motion-fast` | Brief direct-manipulation feedback; not a decorative sequence. |
| `--gc-motion-base` | Default component transition duration; not a timeout. |
| `--gc-motion-slow` | Deliberate entrance or large transition; not indefinite animation. |
| `--gc-easing-standard` | General state-change curve; not an entrance-only curve. |
| `--gc-easing-enter` | Curve for content entering view; not content exiting. |
| `--gc-easing-exit` | Curve for content leaving view; not content entering. |
| `--gc-easing-stepped` | Discrete theme motion; not low-frame-rate animation. |
| `--gc-z-base` | Ordinary document stacking plane; not a CSS layer. |
| `--gc-z-raised` | Locally raised chrome plane; not an overlay. |
| `--gc-z-overlay` | Non-modal overlay plane; not a modal dialog. |
| `--gc-z-modal` | Modal interaction plane; not a visual shadow recipe. |
| `--gc-z-toast` | Transient notification plane above modal content; not DOM order. |
| `--gc-image-rendering` | Theme preference for rendering pixel-like content; not an asset type. |

## 3. State Recipes

The component tier declares one OKLCH recipe each for hover, active, disabled,
and selected fills: `--gc-control-fill-hover`,
`--gc-control-fill-active`, `--gc-control-fill-disabled`, and
`--gc-control-fill-selected`. Themes supply only the semantic base tokens used
by those recipes; they do not enumerate state values.

## 4. Freeze Decision

Finding F-001 in [the foundations review](foundations-review-2026-08-02.md)
asks the operator to approve this vocabulary as frozen. Until that question is
answered yes, downstream documents must call this a freeze candidate.
