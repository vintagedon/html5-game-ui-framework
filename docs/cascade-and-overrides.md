<!--
---
title: "Cascade and Consumer Overrides"
description: "Layer precedence and zero-specificity override contract for framework CSS"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-03"
version: "1.0"
status: "Active"
tags:
  - type: reference
  - domain: foundations
  - tech: [css]
related_documents:
  - "[Project Charter](project-charter.md)"
  - "[Framework Entry](../src/gc.css)"
---
-->

# Cascade and Consumer Overrides

The framework declares this order once in `src/gc.css`:

```css
@layer reset, tokens, core, modules, theme, overrides;
```

Framework default selectors use `:where()`, which contributes zero
specificity. A consumer can override a default with one class. When the
consumer rule shares a layer with a framework default, that class also beats a
later framework default because the class has higher specificity.

Consumers should place application adjustments in the `overrides` layer. The
layer order, rather than selector escalation, then expresses intent.

## Important Declarations

Avoid `!important`. Cascade layers reverse their normal precedence for
important declarations: an important declaration in a lower-precedence layer
beats an important declaration in a higher-precedence layer. For example, an
important declaration in `reset` beats one in `overrides`. This reversal
protects early important rules but contradicts the usual expectation that the
last layer wins.

Framework CSS contains no important declarations. A consumer that introduces
one must account for the reversed important-layer order.
