/**
 * Implements global d for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
declare const __REVEALGDB_DEBUG__: boolean;
declare const __REVEALGDB_BUILD__: "debug" | "release";

declare global {
  var revealGdbBuild: {
    debug: boolean;
    mode: "debug" | "release";
  };
}

export {};
