/**
 * Script Name : specimens.js
 * Description : Export the specimen vocabulary shared by validation and rendering.
 * Repository  : html5-game-ui-framework
 * Author      : VintageDon (https://github.com/vintagedon/)
 * Created     : 2026-08-05
 * Link        : https://github.com/vintagedon/html5-game-ui-framework
 *
 * Pure: no browser or file-system access. The registry validator and reference
 * renderer import this frozen list so accepted specimen types cannot drift from
 * the renderer's supported structural mappings.
 */

export const SPECIMEN_TYPES = Object.freeze([
  "palette",
  "semantic",
  "panel",
  "button",
  "input",
  "meter",
  "spike",
]);
