/**
 * Script Name : contrast.js
 * Description : Build-time contrast gate over the designed-pairings table.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Two enforcement duties, both over the designed-pairings table in pairings.js:
 *  1. Standing rule: every designed pair meets its threshold in every theme.
 *  2. Source membership: a foreground/background pairing present in framework
 *     source but absent from the table is a failure (an undesigned combination).
 *
 * Resolves tokens per theme through var() and color-mix() to OKLCH literals, then
 * applies the WCAG contrast math in color.js. The source scan resolves component
 * tokens to their semantic representative before the membership lookup, so
 * (--gc-button-text, --gc-button-fill) is checked as (text-primary, surface-interactive).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseColor, contrastRatio } from "./color.js";
import { designedPairs } from "./pairings.js";
import { REPO_ROOT, listScopeFiles } from "./scope.js";

const SRC = join(REPO_ROOT, "src");

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Parse a CSS file into {token: rawValue} (last declaration wins). */
function parseDecls(text) {
  const out = {};
  for (const m of stripComments(text).matchAll(/(--gc-[a-z0-9-]+)\s*:\s*([^;{}]+)\s*;/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function readDecls(file) {
  return parseDecls(readFileSync(file, "utf8"));
}

const primitives = readDecls(join(SRC, "tokens/primitives.css"));
const semantic = readDecls(join(SRC, "tokens/semantic.css"));
const components = readDecls(join(SRC, "tokens/components.css"));
const SEMANTIC_SET = new Set(Object.keys(semantic));

const themeFiles = readdirSync(join(SRC, "themes"))
  .filter((f) => f.endsWith(".css"))
  .sort();
const themes = [];
const themeOverrides = {};
for (const f of themeFiles) {
  const text = readFileSync(join(SRC, "themes", f), "utf8");
  const m = stripComments(text).match(/data-gc-theme="([^"]+)"/);
  if (!m) continue;
  themes.push(m[1]);
  themeOverrides[m[1]] = parseDecls(text);
}

const defaults = { ...primitives, ...semantic, ...components };

/** Resolve an expression to an OKLCH color under a given token map, or null. */
function resolveColor(expr, map, seen = new Set()) {
  if (expr == null) return null;
  const v = String(expr).trim();
  if (v === "" || seen.has(v)) return null;

  if (/^(oklch|#[0-9a-f]|rgba?)/i.test(v)) return parseColor(v);

  const cm = v.match(/^color-mix\(\s*in\s+oklch\s*,\s*(.+)\)$/i);
  if (cm) {
    const parts = splitTopLevel(cm[1], ",");
    if (parts.length !== 2) return null;
    const [a, b] = parts.map((p) => {
      const pm = p.trim().match(/^(.+?)\s+([0-9]+(?:\.[0-9]+)?)%$/);
      return pm ? { expr: pm[1].trim(), p: Number(pm[2]) / 100 } : { expr: p.trim(), p: null };
    });
    let pa = a.p ?? null;
    let pb = b.p ?? null;
    if (pa == null && pb == null) { pa = 0.5; pb = 0.5; }
    else if (pa == null) pa = 1 - pb;
    else if (pb == null) pb = 1 - pa;
    const ca = resolveColor(a.expr, map, seen);
    const cb = resolveColor(b.expr, map, seen);
    if (!ca || !cb) return null;
    return mixOklch(ca, pa, cb, pb);
  }

  const vm = v.match(/^var\(\s*(--gc-[a-z0-9-]+)\s*(?:,\s*(.+))?\)$/);
  if (vm) {
    seen.add(v);
    const val = map[vm[1]] != null ? resolveColor(map[vm[1]], map, seen) : null;
    return val ?? (vm[2] ? resolveColor(vm[2], map, seen) : null);
  }

  return null;
}

/** Resolve a token to its semantic representative for membership lookups. */
function resolveSemantic(token, map, seen = new Set()) {
  if (SEMANTIC_SET.has(token) || seen.has(token)) return token;
  const raw = map[token];
  if (raw == null) return token;
  const vm = String(raw).trim().match(/^var\(\s*(--gc-[a-z0-9-]+)/);
  if (vm) {
    seen.add(token);
    return resolveSemantic(vm[1], map, seen);
  }
  return token; // component token whose value is a mix/literal (e.g. control-fill-selected)
}

function splitTopLevel(s, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function mixOklch(a, pa, b, pb) {
  const L = a.L * pa + b.L * pb;
  const C = a.C * pa + b.C * pb;
  let h;
  if (a.C < 0.0001) h = b.h;
  else if (b.C < 0.0001) h = a.h;
  else h = angleMix(a.h, b.h, pa);
  return { L, C, h };
}

function angleMix(h1, h2, t) {
  let d = ((h2 - h1 + 540) % 360) - 180;
  return (h1 + d * t + 360) % 360;
}

/** Read all framework CSS in scope (concatenated) for the source scan.
 *  Uses listScopeFiles() (recursive) so contrast.js and scope.js agree on scope:
 *  a CSS file in a subdirectory of src/core is counted by the size metrics and
 *  seen here too. One scope, one answer. */
function frameworkCssSource() {
  let out = "";
  for (const rel of listScopeFiles()) {
    if (rel.endsWith(".css")) out += stripComments(readFileSync(join(REPO_ROOT, rel), "utf8")) + "\n";
  }
  return out;
}

/** Innermost `{ ... }` rule blocks. */
function innermostBlocks(css) {
  const blocks = [];
  const stack = [];
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") stack.push(i);
    else if (css[i] === "}" && stack.length) {
      const open = stack.pop();
      const body = css.slice(open + 1, i);
      if (!body.includes("{")) {
        const before = css.slice(0, open);
        const sm = before.match(/([^{}]*)$/s);
        blocks.push({ selector: sm ? sm[1].trim() : "", body });
      }
    }
  }
  return blocks;
}

function tokenOf(declValue) {
  const m = String(declValue).match(/var\(\s*(--gc-[a-z0-9-]+)/);
  return m ? m[1] : null;
}

/**
 * Parse framework CSS into per-selector fg/bg token declarations. Used by the
 * Playwright runner's browser membership check (A4.3): the runner walks the
 * rendered DOM and, for each element, finds the nearest ancestor whose matched
 * selector declares a foreground/background token, so inheritance is resolved
 * by the browser rather than by a static block scan.
 *
 * Foreground is captured in two channels — text colour and border colour —
 * because both are designed pairings (text 4.5:1, borders 3:1) and both must be
 * checked for membership. bg is background[-color]. Each entry is
 * { selector, fColor, fBorder, bg } (any may be null).
 */
const FG_BORDER_LONGHAND = ["border-color", "border-top-color", "border-bottom-color", "border-left-color", "border-right-color"];
const FG_BORDER_SHORTHAND = ["border", "border-top", "border-right", "border-bottom", "border-left"];

/** Extract the colour token from a `border` shorthand (e.g.
 *  "var(--gc-border-width) solid var(--gc-panel-border)") by resolving each
 *  var() and keeping the first that resolves to a colour (the width token is a
 *  dimension and resolves to null). */
function borderColorToken(declValue, map) {
  const toks = [...String(declValue).matchAll(/var\(\s*(--gc-[a-z0-9-]+)/g)].map((m) => m[1]);
  for (const t of toks) {
    if (resolveColor(`var(${t})`, map)) return t;
  }
  return null;
}

export function fgBgDeclarations() {
  const css = frameworkCssSource();
  const map = defaults;
  const out = [];
  for (const block of innermostBlocks(css)) {
    const decls = {};
    for (const m of block.body.matchAll(/([\w-]+)\s*:\s*([^;{}]+)\s*;/g)) decls[m[1]] = m[2].trim();
    const fColor = tokenOf(decls["color"]);
    const fBorder =
      FG_BORDER_LONGHAND.map((p) => tokenOf(decls[p])).find((t) => t) ||
      FG_BORDER_SHORTHAND.map((p) => borderColorToken(decls[p], map)).find((t) => t) ||
      null;
    const bg = tokenOf(decls["background-color"] || decls["background"]);
    if (fColor || fBorder || bg) out.push({ selector: block.selector, fColor, fBorder, bg });
  }
  return out;
}

/**
 * fgBgDeclarations() with tokens resolved to their semantic representative
 * (component tokens mapped through to semantic), so the runner can pair against
 * the semantic-keyed designed table. Compact shape for browser serialization.
 */
export function semanticDeclarations() {
  const map = defaults;
  const sem = (t) => (t ? resolveSemantic(t, map) : null);
  return fgBgDeclarations().map((d) => ({
    s: d.selector,
    fc: sem(d.fColor),
    fb: sem(d.fBorder),
    b: sem(d.bg),
  }));
}

/**
 * Run the contrast gate.
 *
 * Hard gate (fails the run). Two failure classes live in this build-time gate:
 *  1. Threshold violation — a designed pair below its threshold (text 4.5:1,
 *     non-text 3:1) in any theme.
 *  2. Count mismatch — the gate did not compute a ratio for every designed pair
 *     in every theme (catches any code path that silently drops a pair, and
 *     fires alongside an unresolvable pair).
 * A third failure class — an unresolvable designed pair (fg/bg will not resolve
 * to a solid colour) — is recorded as a threshold-list violation and trips the
 * count assertion, so it is fatal too.
 *
 * Source membership (undesigned fg/bg pairings, including inherited backgrounds)
 * is enforced in the Playwright runner (A4.3), where getComputedStyle resolves
 * inheritance; this gate no longer scans source blocks for it. fgBgDeclarations()
 * below exports the selector→token map that runner check consumes.
 *
 * Amendment 4 removed the former `nonTextAdvisory` bucket (a gate that can
 * reclassify a rule when the rule fires has not built a gate) and closed the
 * silent skips: the null-colour `continue`, the unreported exemption, and the
 * coverage that lived only in JSON detail.
 *
 * @returns {{violations: string[], ratios: object[], standingChecks: number, countAssertion: string|null, themeCount: number}}
 */
export function contrastGate() {
  const violations = [];
  const ratios = [];

  // 1. Standing rule: every designed pair, every theme. A pair that will not
  //    resolve to a colour is a failure, not a skip.
  const pairs = designedPairs();
  let standingChecks = 0;
  for (const theme of themes) {
    const map = { ...defaults, ...(themeOverrides[theme] || {}) };
    for (const [fg, bg, threshold] of pairs) {
      standingChecks++;
      const cf = resolveColor(`var(${fg})`, map);
      const cb = resolveColor(`var(${bg})`, map);
      if (!cf || !cb) {
        violations.push(
          `contrast: ${fg} on ${bg} under "${theme}" would not resolve to a solid colour (fg=${cf ? "ok" : "unresolved"}, bg=${cb ? "ok" : "unresolved"}) — every designed pair must resolve`,
        );
        continue;
      }
      const ratio = contrastRatio(cf, cb);
      ratios.push({ fg, bg, theme, ratio, threshold });
      if (ratio + 1e-6 < threshold) {
        violations.push(`contrast: ${fg} on ${bg} under "${theme}" = ${ratio.toFixed(2)}:1, below ${threshold}:1`);
      }
    }
  }

  // 2. Count assertion: the gate must compute a ratio for every designed pair
  //    in every theme. Agreement proves no pair was silently dropped.
  const expected = pairs.length * themes.length;
  let countAssertion = null;
  if (ratios.length !== expected) {
    countAssertion = `ratio count ${ratios.length} != designed pairs (${pairs.length}) × themes (${themes.length}) = ${expected}; ${expected - ratios.length} designed pair(s) unaccounted for`;
  }

  return { violations, ratios, standingChecks, countAssertion, themeCount: themes.length };
}
