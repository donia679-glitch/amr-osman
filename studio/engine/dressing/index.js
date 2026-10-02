// @ts-nocheck — restored from the compiled app build (types to be re-added)
// Public API of the dressing engine (port of lib/dressing_system — schema + layout + BOM.compute).
// compute(params) is the single entry point; the choice tables let a UI build its editors.
export { compute, EPS, MIN_SPACE } from "./layout.js";
export { compute as computeBom } from "./bom.js";
export { normalize, SCHEMA_VERSION, DEFAULTS, DEFAULT_COMPARTMENT, DEFAULT_ROW, NUMERIC_RULES, CONSTRUCTIONS, CONTENTS, DOORS, DOOR_STYLES, DOOR_STYLE_SPECS, DOOR_LAYOUTS, DOOR_MODES, ROW_TYPES, LEAF_HINGES, LED_MODES, LED_INSTALLS, LED_SENSORS, PLINTH_STYLES, PLINTH_SIDES, SECTION_KINDS, BLIND_PARTITIONS, HANDLE_TYPES, MATERIAL_KEYS, MATERIAL_DEFAULT_NAMES, MAX_SECTIONS, MAX_COMPARTMENTS, MAX_ROWS, MAX_LEAVES, autoHinges, } from "./schema.js";
export * as HandleCatalog from "../handles/catalog.js";
