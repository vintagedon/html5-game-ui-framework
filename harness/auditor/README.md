<!--
---
title: "Dependency Auditor"
description: "Registry-layer dependency auditing shared by the reference page and metrics hard gate"
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

# Dependency Auditor

This directory contains the registry-layer dependency auditor. The reference
page renders its findings for people, while the metrics command treats the same
findings as a hard gate.

---

## 1. Contents

```text
auditor/
├── auditor.js  # Pure dependency audit and hard-gate failure conversion
└── README.md   # This file
```

---

## 2. Files

| File | Description | Status |
|------|-------------|--------|
| [auditor.js](auditor.js) | Enforces the registry's one-direction layer dependency rule | Active |

---

## 4. Related

| Document | Relationship |
|----------|--------------|
| [Conformance Harness](../README.md) | Parent directory |
| [Scenario Registry](../registry/README.md) | Source of dependency declarations |
| [Metrics](../metrics/README.md) | Build-time hard-gate consumer |
