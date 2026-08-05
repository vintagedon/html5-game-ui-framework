<!--
---
title: "Harness Unit Tests"
description: "Node unit tests for pure conformance-harness logic"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.2"
status: "Active"
tags:
  - type: directory-readme
  - domain: harness
  - tech: [javascript, node]
related_documents:
  - "[Conformance Harness](../README.md)"
  - "[Scenario Registry](../registry/README.md)"
---
-->

# Harness Unit Tests

Node's built-in test runner checks pure harness logic before validation,
browser execution, or metrics generation. These tests provide a fast failure
floor beneath the composed reference application and Playwright suite.

---

## 1. Contents

```text
tests/
├── color.test.js                # Published contrast fixtures and color resolution
├── compare.test.js              # Approval-manifest and PNG comparison state machine
├── membership-freshness.test.js # Current-run membership guard
├── membership.test.js           # Rendered identity and coverage accounting
├── runner.test.js               # Viewport-qualified cases and interaction resolution
├── schema.test.js               # Registry validation and renderer-vocabulary behavior
├── semantics.test.js            # Toggle and meter state synchronization
├── scope.test.js                # Metric-scope file classification
└── README.md                    # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [color.test.js](color.test.js) | WCAG contrast and CSS color-resolution unit tests | Active |
| [compare.test.js](compare.test.js) | Approval-manifest and PNG comparator unit tests | Active |
| [membership-freshness.test.js](membership-freshness.test.js) | Current Playwright-run membership guard | Active |
| [membership.test.js](membership.test.js) | Rendered token identity, outline, coverage, and contextual-exemption tests | Active |
| [runner.test.js](runner.test.js) | Viewport-qualified case identity and checkpoint resolution | Active |
| [schema.test.js](schema.test.js) | Registry validation and renderer-vocabulary unit tests | Active |
| [semantics.test.js](semantics.test.js) | Initial and interacted toggle/meter state agreement | Active |
| [scope.test.js](scope.test.js) | Metric-scope file classification | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | Validator and declaration under test |
