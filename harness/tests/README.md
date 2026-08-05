<!--
---
title: "Harness Unit Tests"
description: "Node unit tests for pure conformance-harness logic"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-05"
version: "1.0"
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
├── schema.test.js   # Registry validation and renderer-vocabulary behavior
└── README.md        # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [schema.test.js](schema.test.js) | Registry validation and renderer-vocabulary unit tests | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | Validator and declaration under test |
