/**
 * Script Name : layers.js
 * Description : The frozen four-layer dependency architecture as a single source.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-03
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * The layer order is a frozen charter decision (§4.2): Foundations, Core,
 * Modules, Consumers, with dependency flowing in one direction. The dependency
 * auditor (harness/auditor) reads the layer a specimen declares from the
 * registry and checks it against these names. A layer written literally outside
 * this file and the registry is a second source of truth.
 *
 * These are plain data so both the browser reference page and Node tooling can
 * import them without a file-system read.
 */

export const LAYERS = ["foundations", "core", "modules", "consumers"];

export const LAYER_CAN_DEPEND_ON = {
  foundations: [],
  core: ["foundations"],
  modules: ["foundations", "core"],
  consumers: ["foundations", "core", "modules"],
};
