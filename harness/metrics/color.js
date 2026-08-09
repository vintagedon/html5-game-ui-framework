/**
 * Script Name : color.js
 * Description : OKLCH/sRGB parsing and WCAG contrast ratio (pure, no deps).
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The contrast gate resolves semantic tokens to OKLCH literals and checks the
 * designed-pairing thresholds. OKLCH is the framework's mixing space (charter
 * §4.1), so the tokens parse directly. Conversion follows the OKLab → linear
 * sRGB matrix, then the WCAG 2.x relative-luminance definition. Pure so both the
 * build-time gate and any test can import it.
 */

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/**
 * Parse a CSS color value into OKLCH {L, C, h} (L,C,h numeric; h in degrees).
 * Supports oklch(), #hex, rgb()/rgba(). Returns null when the value is not a
 * solid color (e.g. dimensions, gradients, var references).
 * @param {string} value
 * @returns {{L:number,C:number,h:number}|null}
 */
export function parseColor(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();

  let m = v.match(/^oklch\(([^)]*)\)/i);
  if (m) {
    const p = m[1].split("/")[0].trim().split(/\s+/);
    const L = pctOrNum(p[0]);
    const C = pctOrNum(p[1]);
    const h = p[2] != null ? Number(p[2]) : 0;
    if ([L, C, h].some(Number.isNaN)) return null;
    return { L, C, h };
  }

  m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const hex = m[1];
    let r, g, b;
    if (hex.length === 3) [, r, g, b] = hex.split("").map((c) => parseInt(c + c, 16));
    else if (hex.length === 6 || hex.length === 8) [r, g, b] = [0, 1, 2].map((i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
    else return null;
    return srgbToOklch(r / 255, g / 255, b / 255);
  }

  m = v.match(/^rgba?\(([^)]*)\)/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return srgbToOklch(p[0] / 255, p[1] / 255, p[2] / 255);
  }

  return null;
}

function pctOrNum(s) {
  if (s == null) return NaN;
  s = String(s).trim();
  if (s.endsWith("%")) return Number(s.slice(0, -1)) / 100;
  return Number(s);
}

function srgbToOklch(r, g, b) {
  // sRGB → linear
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const rl = lin(r), gl = lin(g), bl = lin(b);
  // linear sRGB → OKLab
  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const mm = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(mm), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { L, C, h: h < 0 ? h + 360 : h };
}

/** OKLCH → gamma-encoded sRGB [0,1]. */
export function oklchToSrgb({ L, C, h }) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const mm = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = mm ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const enc = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  return [enc(clamp01(r)), enc(clamp01(g)), enc(clamp01(bl))];
}

/** WCAG 2.x relative luminance from a gamma-encoded sRGB triple. */
export function relativeLuminance([r, g, b]) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two OKLCH colors. */
export function contrastRatio(c1, c2) {
  const L1 = relativeLuminance(oklchToSrgb(c1));
  const L2 = relativeLuminance(oklchToSrgb(c2));
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}
