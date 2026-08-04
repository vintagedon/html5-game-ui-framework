/**
 * Script Name : runner.spec.js
 * Description : Registry-driven Playwright runner: drive declared interactions, capture declared checkpoints.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Imports the SAME registry the reference page renders from and drives each
 * declared interaction, taking a capture at each declared checkpoint under each
 * declared theme. No scenario id, interaction, or viewport is written literally
 * here — they all come from the registry. The Gate 2.4 mutation test relies on
 * that: changing a scenario's theme coverage in the registry changes both the
 * rendered page and this runner's executed matrix.
 *
 * Modes:
 *   GC_CAPTURE=1  write candidate captures; do not fail on a missing/diffing
 *                 approved baseline (first-run candidate generation).
 *   (default)     compare each candidate against the approved baseline; fail on
 *                 a diff. A missing baseline is reported, not fatal, until the
 *                 operator approves goldens (agents never write the approved path).
 */

import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../registry/scenarios.js";
import { compareCapture } from "./compare.js";
import { semanticDeclarations } from "../metrics/contrast.js";
import { designedPairs, EXEMPT_FGS } from "../metrics/pairings.js";

const CAPTURE = !!process.env.GC_CAPTURE;
const BASE = process.env.GC_BASE_URL || "http://127.0.0.1:8123";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANDIDATES = join(ROOT, "goldens/candidates");
const APPROVED = join(ROOT, "goldens/approved");
const PAGE = `${BASE}/reference/`;

// One case per (scenario × theme × checkpoint), all sourced from the registry.
const cases = [];
for (const s of registry.scenarios) {
  for (const theme of s.themes) {
    for (const cp of s.checkpoints) {
      cases.push({ id: s.id, theme, checkpoint: cp.name, scenario: s, after: cp.after });
    }
  }
}

/** Resolve an interaction target selector within the scenario's section. */
function within(id, selector) {
  return `[data-scenario="${id}"] ${selector}`;
}

/** Execute one declared interaction on the page. */
async function runInteraction(page, id, it) {
  const target = within(id, it.target || "");
  switch (it.action) {
    case "hover":
      await page.locator(target).hover();
      break;
    case "click":
      await page.locator(target).click();
      break;
    case "focus":
      await page.locator(target).focus();
      break;
    case "type":
      await page.locator(target).fill(String(it.value ?? ""));
      break;
    case "toggle-pressed":
      await page.locator(target).evaluate((el) => el.setAttribute("aria-pressed", "true"));
      break;
    case "set-value":
      await page
        .locator(target)
        .evaluate((el, v) => el.style.setProperty("--gc-meter-value", `${v}%`), String(it.value));
      break;
    case "wait":
      await page.waitForTimeout(Number(it.value) || 0);
      break;
    case "noop":
      break;
    default:
      throw new Error(`runner has no implementation for action "${it.action}"`);
  }
}

// The manifest records every (scenario, theme, checkpoint) the runner executed,
// so the single-declaration mutation test can observe the matrix directly.
const manifest = [];

for (const c of cases) {
  test(`${c.id} [${c.theme}] ${c.checkpoint}`, async ({ page }) => {
    await page.goto(PAGE, { waitUntil: "networkidle" });
    await page.locator(`[data-scenario="${c.id}"]`).waitFor({ state: "visible" });

    // Set this case's theme on the root, then let transitions settle.
    await page.evaluate((t) => {
      document.documentElement.dataset.gcTheme = t;
    }, c.theme);
    await page.waitForTimeout(160);

    // Run the interactions this checkpoint is declared "after", in order.
    for (const name of c.after) {
      const it = c.scenario.interactions.find((i) => i.name === name);
      if (it) await runInteraction(page, c.id, it);
    }
    await page.waitForTimeout(80);

    const rel = `${c.id}/${c.theme}/${c.checkpoint}.png`;
    const candidatePath = join(CANDIDATES, rel);
    const approvedPath = join(APPROVED, rel);
    mkdirSync(dirname(candidatePath), { recursive: true });

    const png = await page
      .locator(`[data-scenario="${c.id}"] .gc-specimen`)
      .screenshot({ type: "png", animations: "disabled" });
    writeFileSync(candidatePath, png);

    manifest.push({ id: c.id, theme: c.theme, checkpoint: c.checkpoint });

    if (CAPTURE) return; // candidate generation: no comparison

    const result = compareCapture(png, approvedPath);
    if (result.status === "diff") {
      throw new Error(
        `golden diff for ${rel}: ${result.diffPixels}/${result.total} pixels (${(result.ratio * 100).toFixed(2)}%)`,
      );
    }
    if (result.status === "size") {
      throw new Error(`golden size mismatch for ${rel}`);
    }
    // "awaiting" (no approved baseline yet) is non-fatal until goldens are approved.
  });
}

// After the run, persist the executed matrix for inspection/mutation tests.
test.afterAll(async () => {
  mkdirSync(CANDIDATES, { recursive: true });
  writeFileSync(join(CANDIDATES, "matrix.json"), JSON.stringify(manifest, null, 2) + "\n");
});

// ---------------------------------------------------------------------------
// Membership check (Amendment 4, A4.3). The static source scan in contrast.js
// only saw fg/bg tokens declared in the SAME innermost block, so inherited
// backgrounds were invisible to it. This check runs in the browser, where
// getComputedStyle + ancestor walk resolves inheritance. For every element
// under every specimen, across every theme, it finds the nearest ancestor whose
// matched selector declares a foreground/background token and records the
// pairing. Every observed pairing must be a designed row (or an enumerated
// exemption); an undesigned pairing fails the run and is named.
// ---------------------------------------------------------------------------
const SEM_DECL = semanticDeclarations();
const DESIGNED_KEYS = new Set(designedPairs().map(([f, b]) => `${f}|${b}`));
const EXEMPT = new Set(EXEMPT_FGS);

// key `${fg}|${bg}` -> { fg, bg, themes: Set, scenarios: Set }
const observed = new Map();
const excludedDisabledByScenario = {};

test("membership: every rendered fg/bg pairing is designed", async ({ page }) => {
  for (const theme of registry.themes) {
    await page.goto(PAGE, { waitUntil: "networkidle" });
    await page.evaluate((t) => {
      document.documentElement.dataset.gcTheme = t;
    }, theme);
    await page.waitForTimeout(160);

    for (const s of registry.scenarios) {
      const pairings = await page.evaluate(
        ([id, decls]) => {
          const root = document.querySelector(`[data-scenario="${id}"] .gc-specimen`);
          if (!root) return [];
          const colorDecls = decls.filter((d) => d.fc);
          const borderDecls = decls.filter((d) => d.fb);
          const bgDecls = decls.filter((d) => d.b);
          // Cascade winner: every framework selector is :where()-wrapped (zero
          // specificity), so among matching declarations the LAST in source order
          // wins. Return that one, not the first.
          const cascadeMatch = (el, list) => {
            let winner = null;
            for (const d of list) {
              try {
                if (el.matches(d.s)) winner = d;
              } catch {
                /* malformed selector from the extractor — skip, never throw */
              }
            }
            return winner;
          };
          // colour and border both inherit; background paints. For each, the
          // nearest ancestor (incl self) whose matched selector declares the
          // token is the source.
          const nearest = (el, list, key) => {
            let n = el;
            while (n && n.nodeType === 1) {
              const d = cascadeMatch(n, list);
              if (d && d[key]) return d[key];
              n = n.parentElement;
            }
            return null;
          };
          const seen = new Set();
          let excludedDisabled = 0;
          // An element within an inactive control is WCAG-exempt (1.4.3 / 1.4.11)
          // and excluded from membership: its border/fill pairings are intentional
          // but carry no contrast obligation. Counted here so the exclusion is
          // visible, not silent.
          const isDisabledControl = (el) => {
            let n = el;
            while (n && n.nodeType === 1) {
              if (n.matches('button[disabled], input[disabled], textarea[disabled], select[disabled], [aria-disabled="true"]')) return true;
              n = n.parentElement;
            }
            return false;
          };
          // An element contributes a TEXT pairing if it renders text: direct
          // text content, or (for form fields) a value/placeholder. Decorative
          // bg-only elements (e.g. .gc-meter__fill, .gc-spike__ornament) are
          // excluded; they are listed in the worklog's exclusion enumeration.
          const rendersText = (el) => {
            if ([...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 0)) return true;
            if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
              return String(el.value || "").trim().length > 0 || String(el.placeholder || "").trim().length > 0;
            }
            return false;
          };
          for (const el of [root, ...root.querySelectorAll("*")]) {
            if (isDisabledControl(el)) { excludedDisabled++; continue; }
            const bg = nearest(el, bgDecls, "b"); // background paints; nearest painting ancestor
            if (!bg) continue;
            // text colour inherits — walk ancestors
            if (rendersText(el)) {
              const fc = nearest(el, colorDecls, "fc");
              if (fc) seen.add(`${fc}|${bg}`);
            }
            // border colour does NOT inherit — only the element's own cascade-winning declaration
            const ownBorder = cascadeMatch(el, borderDecls);
            if (ownBorder && ownBorder.fb) seen.add(`${ownBorder.fb}|${bg}`);
          }
          return { pairings: [...seen], excludedDisabled };
        },
        [s.id, SEM_DECL],
      );
      const excludedDisabledTotal = (excludedDisabledByScenario[s.id] = (excludedDisabledByScenario[s.id] || 0) + (pairings.excludedDisabled || 0));
      for (const key of pairings.pairings) {
        if (!observed.has(key)) observed.set(key, { fg: key.split("|")[0], bg: key.split("|")[1], themes: new Set(), scenarios: new Set() });
        const e = observed.get(key);
        e.themes.add(theme);
        e.scenarios.add(s.id);
      }
    }
  }

  // Report observed pairings (count is materially larger than the static seven).
  const totalExcludedDisabled = Object.values(excludedDisabledByScenario).reduce((a, b) => a + b, 0);
  const report = {
    distinctPairings: observed.size,
    designedKeys: DESIGNED_KEYS.size,
    excluded: {
      disabledControlElements: totalExcludedDisabled,
      reason: "WCAG 1.4.3 / 1.4.11 inactive-control exemption; pairings on disabled controls carry no contrast obligation",
      decorativeBgOnlyElements: [".gc-meter__fill", ".gc-spike__ornament"],
      decorativeReason: "background token with no text and no own border; not a fg/bg pairing",
    },
    pairings: [...observed.values()].map((e) => ({
      fg: e.fg,
      bg: e.bg,
      designed: DESIGNED_KEYS.has(`${e.fg}|${e.bg}`),
      exempt: EXEMPT.has(e.fg),
      themes: [...e.themes],
      scenarios: [...e.scenarios],
    })),
  };
  mkdirSync(join(ROOT, "runner"), { recursive: true });
  writeFileSync(join(ROOT, "runner/membership.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    `\nmembership: ${observed.size} distinct fg/bg pairings observed across ${registry.themes.length} themes (designed table: ${DESIGNED_KEYS.size}); ${totalExcludedDisabled} element(s) excluded as disabled-control (WCAG-exempt)`,
  );

  // Every observed pairing must resolve to a designed row (or an exempt fg).
  const undesigned = [...observed.values()].filter(
    (e) => !DESIGNED_KEYS.has(`${e.fg}|${e.bg}`) && !EXEMPT.has(e.fg),
  );
  if (undesigned.length) {
    throw new Error(
      `membership: ${undesigned.length} undesigned fg/bg pairing(s) observed in the rendered tree:\n  ` +
        undesigned.map((e) => `${e.fg} on ${e.bg} (scenarios: ${[...e.scenarios].join(", ")})`).join("\n  "),
    );
  }
});
