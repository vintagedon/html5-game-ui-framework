/**
 * Script Name : output-safety.js
 * Description : Contain Playwright-owned output paths away from goldens.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-09-01
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Playwright has output routing in both CLI options and reporter-specific
 * environment variables. Output paths containing symlinks are unsupported;
 * lstat each existing component before checking lexical and resolved paths so
 * dangling links cannot disguise either side of a protected relationship.
 */

import { lstatSync, readlinkSync, realpathSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";

export const PLAYWRIGHT_OUTPUT_ENVIRONMENT_KEYS = Object.freeze([
  "PLAYWRIGHT_JSON_OUTPUT_FILE",
  "PLAYWRIGHT_JSON_OUTPUT_DIR",
  "PLAYWRIGHT_JSON_OUTPUT_NAME",
  "PLAYWRIGHT_JUNIT_OUTPUT_FILE",
  "PLAYWRIGHT_JUNIT_OUTPUT_DIR",
  "PLAYWRIGHT_JUNIT_OUTPUT_NAME",
  "PLAYWRIGHT_BLOB_OUTPUT_FILE",
  "PLAYWRIGHT_BLOB_OUTPUT_DIR",
  "PLAYWRIGHT_BLOB_OUTPUT_NAME",
  "PLAYWRIGHT_HTML_OUTPUT_DIR",
  "PLAYWRIGHT_HTML_REPORT",
  "PLAYWRIGHT_LAST_RUN_OUTPUT_FILE",
]);

export const PLAYWRIGHT_REPORTER_ENVIRONMENT_KEYS = Object.freeze([
  "PW_TEST_REPORTER",
]);

function pathIsWithin(root, candidate) {
  const fromRoot = relative(root, candidate);
  return fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot));
}

function lstatIfPresent(target) {
  try {
    return lstatSync(target);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

function pathContainsSymlink(target, cwd = process.cwd()) {
  const absoluteTarget = resolve(cwd, target);
  const { root } = parse(absoluteTarget);
  let cursor = root;
  for (const component of relative(root, absoluteTarget).split(sep).filter(Boolean)) {
    cursor = resolve(cursor, component);
    const status = lstatIfPresent(cursor);
    if (!status) return false;
    if (status.isSymbolicLink()) return true;
  }
  return false;
}

export function resolveThroughExistingAncestor(target, cwd = process.cwd()) {
  let cursor = resolve(cwd, target);
  const suffix = [];
  while (!lstatIfPresent(cursor)) {
    suffix.unshift(basename(cursor));
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  return resolve(realpathSync(cursor), ...suffix);
}

/**
 * Resolve a path in kernel order: follow symlinks as the components are
 * encountered and pop `..` against the resolved state, never against the
 * lexical string. Lexical normalization collapses `link/..` before the link
 * is ever inspected, so a destination like `outside/link/../x`, where the
 * link points under a protected root, lexically reads as `outside/x` while
 * the filesystem lands inside the root. That divergence is the evasion this
 * resolver exists to close.
 *
 * @param {string} target raw destination, absolute or relative to cwd
 * @param {string} [cwd]
 * @returns {{resolved: string, sawSymlink: boolean}}
 */
export function resolveKernelOrder(target, cwd = process.cwd()) {
  const raw = isAbsolute(target) ? target : `${cwd}${target.startsWith(sep) ? "" : sep}${target}`;
  const { root } = parse(raw);
  let current = root;
  let sawSymlink = false;
  for (const segment of raw.split(sep)) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      const parent = dirname(current);
      if (parent !== current) current = parent;
      continue;
    }
    const next = resolve(current, segment);
    const status = lstatIfPresent(next);
    if (!status) {
      // Nothing beyond a missing component can exist; the rest is suffix.
      return { resolved: resolve(current, segment), sawSymlink };
    }
    if (status.isSymbolicLink()) {
      sawSymlink = true;
      const linkTarget = readlinkSync(next);
      current = isAbsolute(linkTarget) ? linkTarget : resolve(current, linkTarget);
      continue;
    }
    current = next;
  }
  return { resolved: current, sawSymlink };
}

function pathsTouch(left, right) {
  return pathIsWithin(left, right) || pathIsWithin(right, left);
}

export function targetTouchesProtected(
  target,
  { protectedRoots, cwd = process.cwd() },
) {
  if (pathContainsSymlink(target, cwd)) return true;
  const lexicalTarget = resolve(cwd, target);
  const resolvedTarget = resolveThroughExistingAncestor(target, cwd);
  // Kernel-order resolution catches destinations whose lexical form looks
  // safe only because `..` collapsed a symlinked component out of the string.
  const kernel = resolveKernelOrder(target, cwd);
  if (kernel.sawSymlink) return true;
  return protectedRoots.some((protectedRoot) => {
    const lexicalProtectedRoot = resolve(cwd, protectedRoot);
    const resolvedProtectedRoot = resolveThroughExistingAncestor(protectedRoot, cwd);
    const kernelProtectedRoot = resolveKernelOrder(protectedRoot, cwd).resolved;
    return pathsTouch(lexicalProtectedRoot, lexicalTarget) ||
      pathsTouch(resolvedProtectedRoot, resolvedTarget) ||
      pathsTouch(kernelProtectedRoot, kernel.resolved);
  });
}

function assertSafeTarget(label, target, options) {
  if (!target) return;
  if (targetTouchesProtected(target, options)) {
    throw new Error(`${label} touches protected golden output: ${target}`);
  }
}

function outputFileFromDirectory(environment, prefix, cwd) {
  const outputName = environment[`PLAYWRIGHT_${prefix}_OUTPUT_NAME`];
  if (!outputName) return undefined;
  const outputDirectory = environment[`PLAYWRIGHT_${prefix}_OUTPUT_DIR`] || cwd;
  return resolve(cwd, outputDirectory, outputName);
}

export function assertSafePlaywrightEnvironment(
  environment,
  { protectedRoots, cwd = process.cwd() },
) {
  if (environment.PW_TEST_REPORTER) {
    throw new Error("comparison command does not accept PW_TEST_REPORTER");
  }
  for (const prefix of ["JSON", "JUNIT", "BLOB"]) {
    assertSafeTarget(
      `PLAYWRIGHT_${prefix}_OUTPUT_FILE`,
      environment[`PLAYWRIGHT_${prefix}_OUTPUT_FILE`],
      { protectedRoots, cwd },
    );
    assertSafeTarget(
      `PLAYWRIGHT_${prefix}_OUTPUT_DIR/NAME`,
      outputFileFromDirectory(environment, prefix, cwd),
      { protectedRoots, cwd },
    );
    // A directory selected with no output name is itself the destination and
    // resolves through the same validation as a named output.
    assertSafeTarget(
      `PLAYWRIGHT_${prefix}_OUTPUT_DIR`,
      environment[`PLAYWRIGHT_${prefix}_OUTPUT_DIR`],
      { protectedRoots, cwd, directory: true },
    );
  }
  for (const name of ["PLAYWRIGHT_BLOB_OUTPUT_DIR", "PLAYWRIGHT_HTML_OUTPUT_DIR", "PLAYWRIGHT_HTML_REPORT"]) {
    assertSafeTarget(name, environment[name], { protectedRoots, cwd, directory: true });
  }
  assertSafeTarget(
    "PLAYWRIGHT_LAST_RUN_OUTPUT_FILE",
    environment.PLAYWRIGHT_LAST_RUN_OUTPUT_FILE,
    { protectedRoots, cwd },
  );
}

function optionValue(args, index, name) {
  const argument = args[index];
  if (argument === name) return { value: args[index + 1], consumed: 1 };
  if (argument.startsWith(`${name}=`)) {
    return { value: argument.slice(name.length + 1), consumed: 0 };
  }
  return undefined;
}

export function assertSafePlaywrightArguments(
  args,
  {
    protectedRoots,
    cwd = process.cwd(),
    allowConfig = false,
    rejectReporter = true,
  },
) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const configOption = optionValue(args, index, "--config");
    const shortConfig = argument === "-c" || argument.startsWith("-c") && argument.length > 2;
    if (!allowConfig && (configOption || shortConfig)) {
      throw new Error("comparison command does not accept an alternate Playwright config");
    }
    const reporterOption = optionValue(args, index, "--reporter");
    if (rejectReporter && reporterOption) {
      throw new Error("comparison command does not accept a reporter override");
    }
    const outputOption = optionValue(args, index, "--output");
    if (outputOption) {
      assertSafeTarget("--output", outputOption.value, {
        protectedRoots,
        cwd,
        directory: true,
      });
      throw new Error("comparison command does not accept --output");
    }
    const lastRunOption = optionValue(args, index, "--last-failed-file");
    if (lastRunOption) {
      assertSafeTarget("--last-failed-file", lastRunOption.value, {
        protectedRoots,
        cwd,
      });
      throw new Error("comparison command does not accept --last-failed-file");
    }
  }
}

export function stripPlaywrightOutputEnvironment(environment) {
  const clean = { ...environment };
  for (const name of PLAYWRIGHT_OUTPUT_ENVIRONMENT_KEYS) delete clean[name];
  for (const name of PLAYWRIGHT_REPORTER_ENVIRONMENT_KEYS) delete clean[name];
  return clean;
}
