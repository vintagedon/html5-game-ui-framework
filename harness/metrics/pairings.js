/**
 * Script Name : pairings.js
 * Description : The designed foreground/background pairings the contrast gate enforces.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * This is the machine-readable form of the designed-pairings table in
 * docs/token-reference.md. The contrast gate enforces two things from it: every
 * designed pair meets its threshold in every theme (the standing 4.5:1 / 3:1
 * rule), and a foreground/background pairing present in framework source but
 * absent here is a failure (a component invented an undesigned combination).
 *
 * If the two ever disagree, token-reference.md is authoritative and this file is
 * the defect. Keep them in lockstep; a drift between them is a vocabulary gap.
 */

const SURFACES = [
  "--gc-surface-canvas",
  "--gc-surface-base",
  "--gc-surface-raised",
  "--gc-surface-sunken",
  "--gc-surface-interactive",
  "--gc-surface-overlay",
];

// Rows mirror docs/token-reference.md "Designed pairings and thresholds".
export const DESIGNED_ROWS = [
  {
    fgs: ["--gc-text-primary", "--gc-text-secondary", "--gc-text-muted"],
    bgs: SURFACES,
    threshold: 4.5,
  },
  {
    fgs: ["--gc-on-accent"],
    bgs: ["--gc-accent", "--gc-control-fill-selected"],
    threshold: 4.5,
  },
  { fgs: ["--gc-on-status-success"], bgs: ["--gc-status-success"], threshold: 4.5 },
  { fgs: ["--gc-on-status-warning"], bgs: ["--gc-status-warning"], threshold: 4.5 },
  { fgs: ["--gc-on-status-danger"], bgs: ["--gc-status-danger"], threshold: 4.5 },
  { fgs: ["--gc-on-status-info"], bgs: ["--gc-status-info"], threshold: 4.5 },
  // Non-text UI (WCAG 1.4.11): borders/divider/focus-ring against the surfaces they are drawn on.
  {
    fgs: ["--gc-border-default", "--gc-border-strong", "--gc-divider", "--gc-focus-ring"],
    bgs: SURFACES,
    threshold: 3,
  },
];

// Expanded (fg, bg) -> threshold. Membership check resolves component tokens to
// semantic first, so e.g. (--gc-button-text, --gc-button-fill) maps through to
// (--gc-text-primary, --gc-surface-interactive).
const PAIR_THRESHOLD = new Map();
for (const row of DESIGNED_ROWS) {
  for (const fg of row.fgs) for (const bg of row.bgs) PAIR_THRESHOLD.set(`${fg}|${bg}`, row.threshold);
}

/** Threshold for a semantic (fg, bg) pair, or null when the pairing is undesigned. */
export function thresholdFor(fg, bg) {
  return PAIR_THRESHOLD.has(`${fg}|${bg}`) ? PAIR_THRESHOLD.get(`${fg}|${bg}`) : null;
}

/** Is a semantic (fg, bg) pair a designed combination? */
export function isDesigned(fg, bg) {
  return PAIR_THRESHOLD.has(`${fg}|${bg}`);
}

// Foreground tokens deliberately outside the designed table, each with a
// recorded reason. Per the "Outside the rule" section of docs/token-reference.md.
// An exemption is enumerated and counted here so it is visible: an exemption
// that is not counted is invisible, which is how the former advisory bucket got
// its cover. To add one, append {token, reason} and the metrics block reports it.
export const EXEMPTIONS = [
  {
    token: "--gc-text-disabled",
    reason: "WCAG 1.4.3 exempts text on inactive controls; this token is consumed only by disabled buttons/inputs.",
  },
];

const EXEMPT_FGS = new Set(EXEMPTIONS.map((e) => e.token));
export { EXEMPT_FGS };

/** Every designed pair as [fg, bg, threshold], for the standing-rule computation. */
export function designedPairs() {
  const out = [];
  for (const [k, t] of PAIR_THRESHOLD) {
    const [fg, bg] = k.split("|");
    out.push([fg, bg, t]);
  }
  return out;
}
