/**
 * Implements index d for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
declare module "*.png";
declare module "*.gif";
declare module "*.css";
declare module "*.png?asset" {
  const url: string;
  export default url;
}
declare module "*.css?inline" {
  const css: string;
  export default css;
}

declare const __REVEALGDB_DEBUG__: boolean;
declare const __REVEALGDB_BUILD__: "debug" | "release";

declare global {
  interface Window {
    revealGdbBuild: {
      debug: boolean;
      mode: "debug" | "release";
    };
    __HEXEDITOR_TEST_DATA__?: number[];
    __GDB_COMMAND_TEST_SETTINGS__?: {
      history: string[];
    };
    __GDB_COMMAND_TEST_API__?: {
      emitConsole: (message: string) => void;
      emitLog: (message: string) => void;
      emitError: (message: string) => void;
      emitDebug: (message: string) => void;
      emitNotifyRender: (message: { command: string }) => void;
      getSentCommands: () => string[];
      getSavedHistory: () => string[];
      reset: () => void;
    };
  }
}
