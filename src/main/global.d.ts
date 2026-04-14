/**
 * Implements global d for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */

declare global {
  var __REVEALGDB_DEBUG__: boolean;
  var __REVEALGDB_BUILD__: "debug" | "release";
  var revealGdbBuild: {
    debug: boolean;
    mode: "debug" | "release";
  };
}

export {};
