/**
 * Script Name : membership.js
 * Description : Inspect photographed specimens and aggregate pairing coverage.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * `inspectRenderedSpecimen` is deliberately self-contained because Playwright
 * serializes it into the browser. The remaining exports are pure Node-side
 * accounting helpers used by the runner and unit tests.
 */

/** Inspect all rendered elements beneath one specimen in the current state. */
export function inspectRenderedSpecimen({ scenarioId, declarations }) {
  const observations = [];
  const exclusions = [];
  const failures = [];
  const failureKeys = new Set();
  const root = document.querySelector(
    `[data-scenario="${scenarioId}"] .gc-specimen`,
  );

  const identify = (element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes = [...element.classList].map((name) => `.${name}`).join("");
    return `${tag}${id}${classes}`;
  };
  const fail = (kind, element, detail) => {
    const key = `${kind}|${identify(element)}|${detail}`;
    if (failureKeys.has(key)) return;
    failureKeys.add(key);
    failures.push({ kind, element: identify(element), detail });
  };

  if (!root) {
    return {
      observations,
      exclusions,
      failures: [{
        kind: "missing-specimen",
        element: `[data-scenario="${scenarioId}"]`,
        detail: "rendered specimen root is absent",
      }],
    };
  }

  const regularDeclarations = declarations.filter((entry) => !entry.p);
  const placeholderDeclarations = declarations.filter(
    (entry) => entry.p === "::placeholder",
  );
  const channelDeclarations = (channel, list = regularDeclarations) =>
    list.filter((entry) => entry[channel]);

  const cascadeMatch = (element, list) => {
    let winner = null;
    for (const declaration of list) {
      try {
        if (element.matches(declaration.s)) winner = declaration;
      } catch (error) {
        fail(
          "malformed-selector",
          element,
          `selector "${declaration.s}" could not be matched: ${error.message}`,
        );
      }
    }
    return winner;
  };

  const nearestDeclaration = (element, channel, list) => {
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const declaration = cascadeMatch(current, list);
      if (declaration?.[channel]) {
        return { owner: current, descriptor: declaration[channel] };
      }
      current = current.parentElement;
    }
    return null;
  };

  const normalizedExpression = (expression, property) => {
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.setProperty(property, expression);
    document.body.append(probe);
    const value = getComputedStyle(probe).getPropertyValue(property).trim();
    probe.remove();
    return value;
  };

  const confirmComputedValue = ({
    element,
    descriptor,
    property,
    computedValue,
    channel,
  }) => {
    const expected = normalizedExpression(descriptor.expression, property);
    if (!expected || expected !== computedValue) {
      fail(
        "computed-token-mismatch",
        element,
        `${channel} selected ${descriptor.token} (${descriptor.semantic}) as ${expected || "unresolved"}, computed ${computedValue || "empty"}`,
      );
      return false;
    }
    return true;
  };

  const isTransparent = (value) =>
    value === "transparent" ||
    /^rgba\([^)]*,\s*0\)$/.test(value) ||
    /\/\s*0\s*\)$/.test(value);

  const paintedBackground = (element, channel) => {
    let current = element;
    const backgroundDeclarations = channelDeclarations("b");
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const value = getComputedStyle(current).backgroundColor.trim();
      if (!isTransparent(value)) {
        const declaration = cascadeMatch(current, backgroundDeclarations);
        if (!declaration?.b) {
          fail(
            "unclassified-background",
            current,
            `${channel} adjacent background ${value} has no token declaration`,
          );
          return null;
        }
        confirmComputedValue({
          element: current,
          descriptor: declaration.b,
          property: "background-color",
          computedValue: value,
          channel: `${channel} background`,
        });
        return { descriptor: declaration.b, value };
      }
      current = current.parentElement;
    }
    fail(
      "missing-painted-background",
      element,
      `${channel} has no painted background through the document root`,
    );
    return null;
  };

  const inInactiveControl = (element) => Boolean(element.closest(
    'button:disabled, input:disabled, textarea:disabled, select:disabled, [aria-disabled="true"]',
  ));
  const foundationSwatch = (element) =>
    scenarioId.startsWith("foundations-") && element.closest(".token-swatch");

  const addObservation = ({
    channel,
    element,
    foreground,
    foregroundValue,
    backgroundStart,
  }) => {
    const background = paintedBackground(backgroundStart, channel);
    if (!background) return;
    observations.push({
      channel,
      element: identify(element),
      foreground: { ...foreground, value: foregroundValue },
      background: { ...background.descriptor, value: background.value },
    });
  };

  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (foundationSwatch(element)) {
      exclusions.push({
        reason: "foundation-dynamic-swatch",
        element: identify(element),
      });
      continue;
    }
    if (inInactiveControl(element)) {
      exclusions.push({
        reason: "inactive-control",
        element: identify(element),
      });
      continue;
    }

    let elementObservations = 0;
    const style = getComputedStyle(element);
    const directText = [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim(),
    );
    const formValue =
      (element.tagName === "INPUT" || element.tagName === "TEXTAREA") &&
      String(element.value || "").trim();
    const placeholder =
      (element.tagName === "INPUT" || element.tagName === "TEXTAREA") &&
      !formValue &&
      String(element.placeholder || "").trim();

    if (directText || formValue) {
      const source = nearestDeclaration(
        element,
        "fc",
        channelDeclarations("fc"),
      );
      if (!source) {
        fail("unclassified-text", element, `text color ${style.color} has no token declaration`);
      } else {
        confirmComputedValue({
          element,
          descriptor: source.descriptor,
          property: "color",
          computedValue: style.color.trim(),
          channel: "text",
        });
        addObservation({
          channel: "text",
          element,
          foreground: source.descriptor,
          foregroundValue: style.color.trim(),
          backgroundStart: element,
        });
        elementObservations++;
      }
    }

    if (placeholder) {
      const declaration = cascadeMatch(
        element,
        channelDeclarations("fc", placeholderDeclarations),
      );
      const placeholderStyle = getComputedStyle(element, "::placeholder");
      if (!declaration?.fc) {
        fail(
          "unclassified-placeholder",
          element,
          `placeholder color ${placeholderStyle.color} has no token declaration`,
        );
      } else {
        confirmComputedValue({
          element,
          descriptor: declaration.fc,
          property: "color",
          computedValue: placeholderStyle.color.trim(),
          channel: "placeholder",
        });
        addObservation({
          channel: "placeholder",
          element,
          foreground: declaration.fc,
          foregroundValue: placeholderStyle.color.trim(),
          backgroundStart: element,
        });
        elementObservations++;
      }
    }

    const borderDeclaration = cascadeMatch(
      element,
      channelDeclarations("fb"),
    );
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const width = Number.parseFloat(style[`border${side}Width`]);
      const borderStyle = style[`border${side}Style`];
      if (!(width > 0) || borderStyle === "none" || borderStyle === "hidden") continue;
      const color = style[`border${side}Color`].trim();
      if (!borderDeclaration?.fb) {
        fail(
          "unclassified-border",
          element,
          `border-${side.toLowerCase()} color ${color} has no token declaration`,
        );
        continue;
      }
      confirmComputedValue({
        element,
        descriptor: borderDeclaration.fb,
        property: "color",
        computedValue: color,
        channel: `border-${side.toLowerCase()}`,
      });
      addObservation({
        channel: `border-${side.toLowerCase()}`,
        element,
        foreground: borderDeclaration.fb,
        foregroundValue: color,
        backgroundStart: element.parentElement,
      });
      elementObservations++;
    }

    const outlineWidth = Number.parseFloat(style.outlineWidth);
    if (
      outlineWidth > 0 &&
      style.outlineStyle !== "none" &&
      style.outlineStyle !== "hidden"
    ) {
      const outlineDeclaration = cascadeMatch(
        element,
        channelDeclarations("fo"),
      );
      if (!outlineDeclaration?.fo) {
        fail(
          "unclassified-outline",
          element,
          `outline color ${style.outlineColor} has no token declaration`,
        );
      } else {
        confirmComputedValue({
          element,
          descriptor: outlineDeclaration.fo,
          property: "color",
          computedValue: style.outlineColor.trim(),
          channel: "outline",
        });
        addObservation({
          channel: "outline",
          element,
          foreground: outlineDeclaration.fo,
          foregroundValue: style.outlineColor.trim(),
          backgroundStart: element.parentElement,
        });
        elementObservations++;
      }
    }

    if (elementObservations === 0) {
      exclusions.push({
        reason: "structural-no-audited-channel",
        element: identify(element),
      });
    }
  }

  return { observations, exclusions, failures };
}

/** Create mutable accounting state for one complete runner matrix. */
export function createMembershipCollector({ designedKeys, expectedSamples }) {
  return {
    designedKeys: new Set(designedKeys),
    expectedSamples,
    sampleKeys: new Set(),
    totalObservations: 0,
    observedIdentities: new Map(),
    exclusions: [],
    failures: [],
  };
}

function caseContext(captureCase) {
  return {
    scenario: captureCase.id,
    theme: captureCase.theme,
    viewport: captureCase.viewport.name,
    checkpoint: captureCase.checkpoint.name,
  };
}

/** Add one browser sample and classify every observed pairing. */
export function recordMembershipSample(collector, captureCase, sample) {
  const context = caseContext(captureCase);
  collector.sampleKeys.add(Object.values(context).join("|"));

  for (const exclusion of sample.exclusions) {
    collector.exclusions.push({ ...context, ...exclusion });
  }
  for (const failure of sample.failures) {
    collector.failures.push({ ...context, ...failure });
  }

  for (const observation of sample.observations) {
    collector.totalObservations++;
    const foreground = observation.foreground?.semantic;
    const background = observation.background?.semantic;
    const key = `${foreground}|${background}`;
    if (foreground === "--gc-text-disabled") {
      collector.failures.push({
        ...context,
        kind: "contextual-exemption-violation",
        channel: observation.channel,
        element: observation.element,
        detail: `active element uses context-only token --gc-text-disabled on ${background}`,
      });
      continue;
    }
    if (!foreground || !background || !collector.designedKeys.has(key)) {
      collector.failures.push({
        ...context,
        kind: "undesigned-pairing",
        channel: observation.channel,
        element: observation.element,
        detail: `${observation.channel} pairing ${foreground || "unclassified"} on ${background || "unclassified"} is not designed`,
      });
      continue;
    }

    if (!collector.observedIdentities.has(key)) {
      collector.observedIdentities.set(key, {
        foreground,
        background,
        count: 0,
        channels: new Set(),
        scenarios: new Set(),
        themes: new Set(),
        viewports: new Set(),
        checkpoints: new Set(),
      });
    }
    const aggregate = collector.observedIdentities.get(key);
    aggregate.count++;
    aggregate.channels.add(observation.channel);
    aggregate.scenarios.add(context.scenario);
    aggregate.themes.add(context.theme);
    aggregate.viewports.add(context.viewport);
    aggregate.checkpoints.add(context.checkpoint);
  }
}

/** Build the persisted report with the five required coverage values. */
export function buildMembershipReport(collector, { runId }) {
  const failures = [...collector.failures];
  if (collector.sampleKeys.size !== collector.expectedSamples) {
    failures.push({
      kind: "sample-count-mismatch",
      detail: `membership sampled ${collector.sampleKeys.size} capture cases, expected ${collector.expectedSamples}`,
    });
  }

  const exclusionsByReason = {};
  for (const exclusion of collector.exclusions) {
    exclusionsByReason[exclusion.reason] =
      (exclusionsByReason[exclusion.reason] || 0) + 1;
  }

  return {
    version: 2,
    runId,
    generatedAt: new Date().toISOString(),
    samples: {
      expected: collector.expectedSamples,
      observed: collector.sampleKeys.size,
    },
    coverage: {
      designedPairIdentities: collector.designedKeys.size,
      distinctObservedIdentities: collector.observedIdentities.size,
      totalObservations: collector.totalObservations,
      exclusionsByReason,
      unclassifiedObservations: failures.length,
    },
    pairings: [...collector.observedIdentities.values()].map((entry) => ({
      ...entry,
      channels: [...entry.channels].sort(),
      scenarios: [...entry.scenarios].sort(),
      themes: [...entry.themes].sort(),
      viewports: [...entry.viewports].sort(),
      checkpoints: [...entry.checkpoints].sort(),
    })),
    exclusions: collector.exclusions,
    failures,
  };
}
