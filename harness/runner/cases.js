/**
 * Script Name : cases.js
 * Description : Build viewport-qualified runner cases and resolve checkpoint interactions.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 */

/** Build the complete scenario x theme x viewport x checkpoint matrix. */
export function buildCases(sourceRegistry) {
  const cases = [];
  for (const scenario of sourceRegistry.scenarios) {
    for (const theme of scenario.themes) {
      for (const viewport of scenario.viewports) {
        for (const checkpoint of scenario.checkpoints) {
          cases.push({
            id: scenario.id,
            scenario,
            theme,
            viewport,
            checkpoint,
          });
        }
      }
    }
  }
  return cases;
}

/** Return the durable, viewport-qualified identity for one capture. */
export function captureIdentity(captureCase) {
  return [
    captureCase.id,
    captureCase.theme,
    captureCase.viewport.name,
    `${captureCase.checkpoint.name}.png`,
  ].join("/");
}

/** Resolve a checkpoint's ordered interactions, failing on stale references. */
export function resolveCheckpointInteractions(scenario, checkpoint) {
  return checkpoint.after.map((name) => {
    const interaction = scenario.interactions.find((entry) => entry.name === name);
    if (!interaction) {
      throw new Error(
        `scenario "${scenario.id}" checkpoint "${checkpoint.name}" references missing interaction "${name}"`,
      );
    }
    return interaction;
  });
}
