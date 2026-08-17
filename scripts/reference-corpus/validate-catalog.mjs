/**
 * Script Name  : validate-catalog.mjs
 * Description  : Pure schema and relationship validator for the UI pack catalog.
 * Repository   : html5-game-ui-framework
 * Author       : VintageDon (https://github.com/vintagedon/)
 * Created      : 2026-08-16
 * Link         : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Validates docs/reference-corpus/ui-pack-inventory.json from the parsed value
 * alone: field presence, enum membership, stable ID formats, canonical
 * ordering, cross-reference resolution in both directions, license coherence,
 * source-kind versus runtime-evidence consistency, redaction rules for
 * evidence pointers, and the game-rule exclusion contract for core and module
 * destinations. It touches no private source tree, so a public clone can run
 * the same checks the ML01 audit runs.
 *
 * License facts follow the operator resolution of 2026-08-16 recorded in the
 * capability map: facts may be grounded in local pack terms or in that
 * resolution, so evidence type no longer bounds fact clarity; only genuinely
 * unclear facts still route a pack to license review. Pack ids are the exact
 * top-level directory names, which may carry version dots.
 *
 * Usage
 * -----
 *     import { validateCatalog } from "./validate-catalog.mjs";
 *     const errors = validateCatalog(JSON.parse(rawCatalogText));
 */

/** Controlled vocabularies frozen by the inventory spec. */
export const ENUMS = {
  sourceKinds: [
    "interactive-code",
    "data-recipe",
    "audio-source",
    "visual-source",
    "font-source",
    "editable-source",
    "layout-manifest",
    "documentation",
  ],
  licenseFactValues: ["supported", "not-supported", "unclear"],
  licenseEvidenceTypes: ["pack-license-file", "readme-external-terms", "none-found"],
  shippingPostures: [
    "derived-technique-only",
    "integrated-finished-output",
    "reference-only",
    "license-review-required",
  ],
  dispositions: [
    "standalone-spec-candidate",
    "game-driven-candidate",
    "reference-lab-candidate",
    "hold-for-consumer",
    "defer",
    "license-review-required",
  ],
  capabilityLanes: ["game-driven", "independent-module", "reference-lab"],
  frameworkDestinations: [
    "foundations",
    "core",
    "module",
    "theme",
    "consumer-recipe",
    "reference-lab",
    "game-only",
  ],
  readinessValues: [
    "ready-to-spec",
    "needs-game-proof",
    "needs-license-review",
    "needs-deduplication",
    "defer",
  ],
  overlapRelationships: ["duplicate", "version-family", "complementary-source"],
  gameCandidateStatus: ["in-flight", "candidate"],
  gameComplexity: ["low", "moderate", "high"],
  excludedConcerns: [
    "game-rules",
    "persistence-ownership",
    "canvas-webgl-rendering",
    "vendor-specific-styling",
  ],
  accessibilityDimensions: [
    "keyboard",
    "focus",
    "announcement",
    "motion",
    "audio",
    "pointer",
    "playfield",
  ],
};

/**
 * File extensions an evidence pointer may cite directly. Binary, audio,
 * image, and editable-source files are never cited file-by-file so the
 * tracked catalog cannot become a reconstructive asset manifest.
 */
export const EVIDENCE_FILE_EXTENSIONS = [
  ".md",
  ".txt",
  ".html",
  ".js",
  ".css",
  ".json",
  ".rpy",
];

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

/** Ownership phrases that must never appear in core/module capability prose. */
const OWNERSHIP_GUARD_PATTERN =
  /(localstorage|save-manager|achievement-manager|achievement-rules|world-data|hit-detection|canvas-rendering|webgl-rendering)/i;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function isSortedUniqueStrings(values, label, errors) {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] === values[index]) {
      errors.push(`${label}: duplicate id "${values[index]}"`);
    }
    if (values[index - 1] > values[index]) {
      errors.push(`${label}: ids must sort ascending ("${values[index - 1]}" before "${values[index]}")`);
    }
  }
}

function validateEvidencePointer(entry, label, errors) {
  if (!isNonEmptyString(entry.path)) {
    errors.push(`${label}: evidence path must be a non-empty string`);
    return;
  }
  if (entry.path.startsWith("/") || entry.path.includes("..") || entry.path.includes("*")) {
    errors.push(`${label}: evidence path "${entry.path}" must be pack-relative without traversal`);
    return;
  }
  const fileName = entry.path.split("/").pop();
  if (fileName.includes(".") && !fileName.startsWith(".")) {
    const extension = `.${fileName.split(".").pop().toLowerCase()}`;
    if (!EVIDENCE_FILE_EXTENSIONS.includes(extension)) {
      errors.push(
        `${label}: evidence path "${entry.path}" cites a non-documentary file; binary, image, audio, and editable-source files are never cited individually`,
      );
    }
  }
  if (!isNonEmptyString(entry.proves)) {
    errors.push(`${label}: evidence entry "${entry.path}" must state what it proves`);
  }
}

function validateSnapshot(snapshot, label, errors) {
  if (!isCount(snapshot.fileCount)) errors.push(`${label}: fileCount must be a non-negative integer`);
  if (!isCount(snapshot.totalBytes)) errors.push(`${label}: totalBytes must be a non-negative integer`);
  if (
    typeof snapshot.extensionCounts !== "object" ||
    snapshot.extensionCounts === null ||
    Array.isArray(snapshot.extensionCounts)
  ) {
    errors.push(`${label}: extensionCounts must be an object`);
  } else if (
    !Object.entries(snapshot.extensionCounts).every(
      ([extension, count]) =>
        extension === "(none)" || /^\.[a-z0-9]+$/.test(extension) === true || extension.startsWith("."),
    ) || !Object.values(snapshot.extensionCounts).every(isCount)
  ) {
    errors.push(`${label}: extensionCounts must map normalized extensions to counts`);
  }
}

function validateRuntimeEvidence(runtimeEvidence, label, errors) {
  const countFields = [
    "htmlDocuments",
    "stylesheets",
    "scripts",
    "dataFiles",
    "images",
    "audioFiles",
    "editableSources",
  ];
  for (const field of countFields) {
    if (!isCount(runtimeEvidence[field])) {
      errors.push(`${label}: runtimeEvidence.${field} must be a non-negative integer`);
    }
  }
  if (typeof runtimeEvidence.runnableHtmlPresent !== "boolean") {
    errors.push(`${label}: runtimeEvidence.runnableHtmlPresent must be a boolean`);
  }
}

function validateLicenseRecord(pack, label, errors) {
  const { licenseEvidence, licenseFacts } = pack;

  if (!licenseEvidence || !ENUMS.licenseEvidenceTypes.includes(licenseEvidence.type)) {
    errors.push(`${label}: licenseEvidence.type must be one of ${ENUMS.licenseEvidenceTypes.join(", ")}`);
    return;
  }
  const locatorIsString = isNonEmptyString(licenseEvidence.locator);
  if (licenseEvidence.type === "none-found" && licenseEvidence.locator !== null) {
    errors.push(`${label}: none-found license evidence must carry a null locator`);
  }
  if (licenseEvidence.type !== "none-found" && !locatorIsString) {
    errors.push(`${label}: license evidence of type ${licenseEvidence.type} requires a locator path`);
  }
  if (locatorIsString && (licenseEvidence.locator.startsWith("/") || licenseEvidence.locator.includes(".."))) {
    errors.push(`${label}: license locator must be pack-relative`);
  }

  const factValues = ["finishedProductUse", "sourceRedistribution", "attribution"];
  let hasUnclear = false;
  for (const fact of factValues) {
    const value = licenseFacts?.[fact];
    if (!ENUMS.licenseFactValues.includes(value)) {
      errors.push(`${label}: licenseFacts.${fact} must be one of ${ENUMS.licenseFactValues.join(", ")}`);
    }
    if (value === "unclear") hasUnclear = true;
  }
  if (!isNonEmptyString(licenseFacts?.note)) {
    errors.push(`${label}: licenseFacts.note must be a concise evidence-bound note`);
  }

  if (hasUnclear) {
    if (pack.shippingPosture !== "license-review-required") {
      errors.push(`${label}: unclear license facts require shippingPosture "license-review-required"`);
    }
    if (pack.disposition !== "license-review-required") {
      errors.push(`${label}: unclear license facts require disposition "license-review-required"`);
    }
  }
}

function validateSourceKindConsistency(pack, label, errors) {
  const { sourceKinds, runtimeEvidence, snapshot } = pack;
  const documentCount = (snapshot.extensionCounts[".md"] ?? 0) + (snapshot.extensionCounts[".txt"] ?? 0);
  const rules = [
    ["interactive-code", runtimeEvidence.htmlDocuments > 0, "runnable HTML documents"],
    ["data-recipe", runtimeEvidence.dataFiles > 0, "JSON data files"],
    ["audio-source", runtimeEvidence.audioFiles > 0, "audio files"],
    ["visual-source", runtimeEvidence.images > 0, "image files"],
    [
      "font-source",
      [".ttf", ".otf", ".woff", ".woff2"].some((extension) => (snapshot.extensionCounts[extension] ?? 0) > 0),
      "font files",
    ],
    ["editable-source", runtimeEvidence.editableSources > 0, "editable source files"],
    ["layout-manifest", runtimeEvidence.dataFiles > 0, "layout manifest data files"],
    ["documentation", documentCount > 0, "documentation files"],
  ];
  for (const [kind, holds, requirement] of rules) {
    if (sourceKinds.includes(kind) && !holds) {
      errors.push(`${label}: sourceKinds includes "${kind}" but the pack contains no ${requirement}`);
    }
  }
}

function validateCapability(capability, packIds, errors) {
  const label = `capability ${capability.id ?? "(missing id)"}`;

  if (!/^CAP-\d{3}$/.test(capability.id ?? "")) {
    errors.push(`${label}: id must match CAP-NNN`);
  }
  if (!isNonEmptyString(capability.name)) errors.push(`${label}: name is required`);
  if (!isNonEmptyString(capability.purpose)) errors.push(`${label}: purpose is required`);

  if (!Array.isArray(capability.lanes) || capability.lanes.length === 0) {
    errors.push(`${label}: at least one candidate lane is required`);
  } else if (capability.lanes.some((lane) => !ENUMS.capabilityLanes.includes(lane))) {
    errors.push(`${label}: lanes must come from ${ENUMS.capabilityLanes.join(", ")}`);
  }

  if (!Array.isArray(capability.contributions) || capability.contributions.length === 0) {
    errors.push(`${label}: at least one contributing pack with direct evidence is required`);
  } else {
    for (const contribution of capability.contributions) {
      if (!packIds.includes(contribution.packId)) {
        errors.push(`${label}: contribution references unknown pack "${contribution.packId}"`);
      }
      if (!isNonEmptyString(contribution.note)) {
        errors.push(`${label}: contribution for "${contribution.packId}" must cite direct evidence`);
      }
    }
  }

  if (!ENUMS.frameworkDestinations.includes(capability.destination)) {
    errors.push(`${label}: destination must be one of ${ENUMS.frameworkDestinations.join(", ")}`);
  }

  if (
    typeof capability.interactionAccessibility !== "object" ||
    capability.interactionAccessibility === null ||
    Array.isArray(capability.interactionAccessibility)
  ) {
    errors.push(`${label}: interactionAccessibility must be an object of dimension notes`);
  } else {
    const dimensions = Object.keys(capability.interactionAccessibility);
    if (dimensions.length === 0) {
      errors.push(`${label}: interactionAccessibility must name at least one burden dimension`);
    } else if (dimensions.some((dimension) => !ENUMS.accessibilityDimensions.includes(dimension))) {
      errors.push(`${label}: accessibility dimensions must come from ${ENUMS.accessibilityDimensions.join(", ")}`);
    }
  }

  const boundary = capability.sourceBoundary;
  if (
    !isNonEmptyString(boundary?.derivable) ||
    !isNonEmptyString(boundary?.notCopyable)
  ) {
    errors.push(`${label}: sourceBoundary must state derivable technique and non-copyable source forms`);
  }

  if (!ENUMS.readinessValues.includes(capability.readiness)) {
    errors.push(`${label}: readiness must be one of ${ENUMS.readinessValues.join(", ")}`);
  }
  if (!isNonEmptyString(capability.missingEvidence)) {
    errors.push(`${label}: missingEvidence must state what blocks immediate specification`);
  }

  if (capability.destination === "core" || capability.destination === "module") {
    const exclusions = capability.excludedConcerns ?? [];
    for (const concern of ENUMS.excludedConcerns) {
      if (!exclusions.includes(concern)) {
        errors.push(
          `${label}: destination "${capability.destination}" must exclude "${concern}" from framework scope`,
        );
      }
    }
    const prose = [capability.name, capability.purpose, boundary?.derivable ?? ""].join(" ");
    if (OWNERSHIP_GUARD_PATTERN.test(prose)) {
      errors.push(
        `${label}: core/module prose claims ownership of game rules, persistence, or renderer concerns`,
      );
    }
  }
}

/** Validate a parsed catalog value and return every rule violation found. */
export function validateCatalog(catalog) {
  const errors = [];
  if (typeof catalog !== "object" || catalog === null || Array.isArray(catalog)) {
    return ["catalog: root must be an object"];
  }

  if (catalog.schemaVersion !== 1) errors.push("catalog: schemaVersion must be 1");
  if (catalog.sourceRoot !== "reference-files-ui") {
    errors.push('catalog: sourceRoot must be "reference-files-ui"');
  }

  const snapshot = catalog.snapshot ?? {};
  if (!isCount(snapshot.packCount) || snapshot.packCount <= 0) {
    errors.push("catalog: snapshot.packCount must be a positive integer");
  }
  validateSnapshot(snapshot, "catalog.snapshot", errors);
  if (typeof snapshot.corpusDigest !== "string" || !DIGEST_PATTERN.test(snapshot.corpusDigest)) {
    errors.push("catalog.snapshot: corpusDigest must be a sha256:<hex> value");
  }

  const packs = catalog.packs;
  if (!Array.isArray(packs) || packs.length === 0) {
    errors.push("catalog: packs must be a non-empty array");
    return errors;
  }
  const packIds = packs.map((pack) => pack.id);
  isSortedUniqueStrings(packIds, "catalog.packs", errors);
  if (snapshot.packCount !== packs.length) {
    errors.push("catalog: snapshot.packCount must equal the packs array length");
  }

  for (const pack of packs) {
    const label = `pack ${pack.id ?? "(missing id)"}`;
    if (!isNonEmptyString(pack.id) || !/^[a-z0-9][a-z0-9.-]*$/.test(pack.id)) {
      errors.push(`${label}: id must be the exact top-level directory name`);
    }
    if (!isNonEmptyString(pack.displayName)) errors.push(`${label}: displayName is required`);

    validateSnapshot(pack.snapshot, `${label}.snapshot`, errors);
    if (typeof pack.snapshot.digest !== "string" || !DIGEST_PATTERN.test(pack.snapshot.digest)) {
      errors.push(`${label}.snapshot: digest must be a sha256:<hex> value`);
    }
    validateRuntimeEvidence(pack.runtimeEvidence ?? {}, `${label}`, errors);

    if (!Array.isArray(pack.sourceKinds) || pack.sourceKinds.length === 0) {
      errors.push(`${label}: sourceKinds must list at least one kind`);
    } else if (pack.sourceKinds.some((kind) => !ENUMS.sourceKinds.includes(kind))) {
      errors.push(`${label}: sourceKinds must come from ${ENUMS.sourceKinds.join(", ")}`);
    } else {
      validateSourceKindConsistency(pack, label, errors);
    }

    if (!Array.isArray(pack.evidence) || pack.evidence.length === 0) {
      errors.push(`${label}: at least one evidence pointer is required`);
    } else {
      pack.evidence.forEach((entry, index) =>
        validateEvidencePointer(entry, `${label}.evidence[${index}]`, errors),
      );
    }

    validateLicenseRecord(pack, label, errors);

    if (!ENUMS.shippingPostures.includes(pack.shippingPosture)) {
      errors.push(`${label}: shippingPosture must be one of ${ENUMS.shippingPostures.join(", ")}`);
    }
    if (!ENUMS.dispositions.includes(pack.disposition)) {
      errors.push(`${label}: disposition must be one of ${ENUMS.dispositions.join(", ")}`);
    }

    if (
      (pack.capabilityIds?.length ?? 0) === 0 &&
      !["defer", "license-review-required"].includes(pack.disposition)
    ) {
      errors.push(`${label}: packs without capabilities must carry an explicit review or defer disposition`);
    }
  }

  const capabilities = catalog.capabilities ?? [];
  if (!Array.isArray(capabilities) || capabilities.length === 0) {
    errors.push("catalog: capabilities must be a non-empty array");
  } else {
    isSortedUniqueStrings(
      capabilities.map((capability) => capability.id),
      "catalog.capabilities",
      errors,
    );
    for (const capability of capabilities) {
      validateCapability(capability, packIds, errors);
    }
  }

  const overlapGroups = catalog.overlapGroups ?? [];
  if (!Array.isArray(overlapGroups)) {
    errors.push("catalog: overlapGroups must be an array");
  } else {
    isSortedUniqueStrings(
      overlapGroups.map((group) => group.id),
      "catalog.overlapGroups",
      errors,
    );
    for (const group of overlapGroups) {
      const label = `overlap group ${group.id ?? "(missing id)"}`;
      if (!/^OVL-\d{3}$/.test(group.id ?? "")) errors.push(`${label}: id must match OVL-NNN`);
      if (!ENUMS.overlapRelationships.includes(group.relationship)) {
        errors.push(`${label}: relationship must be one of ${ENUMS.overlapRelationships.join(", ")}`);
      }
      if (!isNonEmptyString(group.description)) errors.push(`${label}: description is required`);
      if (!Array.isArray(group.packIds) || group.packIds.length < 2) {
        errors.push(`${label}: at least two member packs are required`);
      } else {
        for (const member of group.packIds) {
          if (!packIds.includes(member)) errors.push(`${label}: unknown member pack "${member}"`);
        }
      }
      if (!Array.isArray(group.evidence) || group.evidence.length === 0) {
        errors.push(`${label}: at least one evidence pointer is required`);
      } else {
        group.evidence.forEach((entry, index) => {
          validateEvidencePointer(entry, `${label}.evidence[${index}]`, errors);
          if (!group.packIds?.includes(entry.packId)) {
            errors.push(`${label}.evidence[${index}]: evidence must belong to a member pack`);
          }
        });
      }
    }
  }

  const gameCandidates = catalog.gameCandidates ?? [];
  if (!Array.isArray(gameCandidates) || gameCandidates.length === 0) {
    errors.push("catalog: gameCandidates must be a non-empty array");
  } else {
    isSortedUniqueStrings(
      gameCandidates.map((candidate) => candidate.id),
      "catalog.gameCandidates",
      errors,
    );
    for (const candidate of gameCandidates) {
      const label = `game candidate ${candidate.id ?? "(missing id)"}`;
      if (!/^GC-\d{3}$/.test(candidate.id ?? "")) errors.push(`${label}: id must match GC-NNN`);
      if (!isNonEmptyString(candidate.name)) errors.push(`${label}: name is required`);
      if (!ENUMS.gameCandidateStatus.includes(candidate.status)) {
        errors.push(`${label}: status must be one of ${ENUMS.gameCandidateStatus.join(", ")}`);
      }
      if (!ENUMS.gameComplexity.includes(candidate.complexity)) {
        errors.push(`${label}: complexity must be one of ${ENUMS.gameComplexity.join(", ")}`);
      }
      if (!isNonEmptyString(candidate.engineCapability)) {
        errors.push(`${label}: a genre label without a new engine capability mapping fails validation`);
      }
      if (!isNonEmptyString(candidate.gameuiPressure)) {
        errors.push(`${label}: a genre label without specific GameUI pressure fails validation`);
      }
      if (!Array.isArray(candidate.supportingPackIds) || candidate.supportingPackIds.length === 0) {
        errors.push(`${label}: at least one supporting pack is required`);
      } else {
        for (const packId of candidate.supportingPackIds) {
          if (!packIds.includes(packId)) errors.push(`${label}: unknown supporting pack "${packId}"`);
        }
      }
      if (!isNonEmptyString(candidate.expectedSpecs)) errors.push(`${label}: expectedSpecs is required`);
      if (!isNonEmptyString(candidate.risk)) errors.push(`${label}: risk is required`);
    }
  }

  const capabilityById = new Map((capabilities ?? []).map((capability) => [capability.id, capability]));
  const overlapById = new Map((overlapGroups ?? []).map((group) => [group.id, group]));
  const candidateById = new Map((gameCandidates ?? []).map((candidate) => [candidate.id, candidate]));

  const packCapabilities = new Map();
  for (const pack of packs) {
    for (const capabilityId of pack.capabilityIds ?? []) {
      if (!capabilityById.has(capabilityId)) {
        errors.push(`pack ${pack.id}: unknown capability reference "${capabilityId}"`);
      } else {
        packCapabilities.set(`${pack.id}\0${capabilityId}`, true);
      }
    }
    for (const groupId of pack.overlapGroupIds ?? []) {
      const group = overlapById.get(groupId);
      if (!group) {
        errors.push(`pack ${pack.id}: unknown overlap group reference "${groupId}"`);
      } else if (!group.packIds.includes(pack.id)) {
        errors.push(`pack ${pack.id}: overlap group ${groupId} does not list it back`);
      }
    }
    for (const consumer of pack.bestGameConsumers ?? []) {
      const candidate = candidateById.get(consumer.candidateId);
      if (!candidate) {
        errors.push(`pack ${pack.id}: unknown game candidate "${consumer.candidateId}"`);
      } else if (!candidate.supportingPackIds.includes(pack.id)) {
        errors.push(`pack ${pack.id}: game candidate ${consumer.candidateId} does not list it back`);
      }
      if (!isNonEmptyString(consumer.fit)) {
        errors.push(`pack ${pack.id}: bestGameConsumers entries need a one-sentence fit`);
      }
    }
  }

  for (const capability of capabilities ?? []) {
    for (const contribution of capability.contributions ?? []) {
      if (packCapabilities.get(`${contribution.packId}\0${capability.id}`) !== true) {
        errors.push(
          `capability ${capability.id}: contributing pack "${contribution.packId}" does not reference it back`,
        );
      }
    }
  }

  for (const group of overlapGroups ?? []) {
    for (const member of group.packIds ?? []) {
      const pack = packs.find((candidate) => candidate.id === member);
      if (pack && !(pack.overlapGroupIds ?? []).includes(group.id)) {
        errors.push(`overlap group ${group.id}: member pack "${member}" does not reference it back`);
      }
    }
  }

  for (const candidate of gameCandidates ?? []) {
    for (const packId of candidate.supportingPackIds ?? []) {
      const pack = packs.find((entry) => entry.id === packId);
      if (pack && !(pack.bestGameConsumers ?? []).some((consumer) => consumer.candidateId === candidate.id)) {
        errors.push(`game candidate ${candidate.id}: supporting pack "${packId}" does not reference it back`);
      }
    }
  }

  return errors;
}

/** Canonical serialization contract for the tracked catalog file. */
export function canonicalCatalogText(catalog) {
  return `${JSON.stringify(catalog, null, 2)}\n`;
}
