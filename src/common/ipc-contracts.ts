/**
 * Implements ipc contracts for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `IPC_CHANNELS`, `NotifyRenderCommand`, `NotifyRenderMessage`, `NotifyMainCommand`, `NotifyMainRequest`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { NormalizedConnection } from "./connection-types";
import type { GridColumnState, GridName } from "./grid-column-types";
import type { SectionsViewOptions } from "./ipc-data-types";

const MAIN_TO_RENDERER_CHANNEL_GROUPS = {
  console: {
    message: "console-message",
    log: "log-message",
    error: "error-message",
    debug: "debug-message",
    html: "html-message",
  },
  notifications: {
    connectionStatus: "connection-status",
    render: "notify-render",
    themeChanged: "theme-changed",
  },
  debuggerData: {
    registers: "data-register",
    stackFrames: "stack-frames",
    sourceFile: "source-file",
    locals: "data-locals",
    threads: "data-threads",
    breakpoints: "data-brkpts",
    memory: "data-memory",
    disassembly: "data-disasm",
    functions: "data-disasm-functions",
    lineVars: "data-line-vars",
  },
} as const;

const RENDERER_TO_MAIN_CHANNEL_GROUPS = {
  queries: {
    app: {
      settings: "getSettings",
      systemFonts: "getSystemFonts",
      versionInfo: "getVersionInfo",
    },
    environment: {
      wslDistributions: "getWslDistrobutions",
    },
    debugger: {
      functionNames: "getFunctionNames",
      varAtPosition: "queryVarAtPosition",
      varByName: "getVarByName",
      evaluateExpression: "evaluateExpression",
      sections: "getSectionData",
      showSourceAt: "showSourceAt",
    },
    workspace: {
      getWorkspaceState: "workspace:getWorkspaceState",
      getAvailableHosts: "workspace:getAvailableHosts",
    },
  },
  commands: {
    debugger: {
      send: "gdb-command",
      sendControlD: "gdb-control-d",
      dangerousCommandResponse: "dangerous-command-response",
    },
    app: {
      notify: "notify-main",
    },
    workspace: {
      saveHostLayout: "workspace:saveHostLayout",
      createNewDockWindow: "workspace:createNewDockWindow",
      moveWindowToHost: "workspace:moveWindowToHost",
    },
  },
} as const;

export const IPC_CHANNELS = {
  mainToRenderer: {
    console: MAIN_TO_RENDERER_CHANNEL_GROUPS.console,
    notifications: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications,
    debuggerData: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData,
    consoleMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.message,
    logMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.log,
    errorMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.error,
    debugMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.debug,
    htmlMessage: MAIN_TO_RENDERER_CHANNEL_GROUPS.console.html,
    connectionStatus: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.connectionStatus,
    notifyRender: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.render,
    themeChanged: MAIN_TO_RENDERER_CHANNEL_GROUPS.notifications.themeChanged,
    dataRegisters: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.registers,
    stackFrames: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.stackFrames,
    sourceFile: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.sourceFile,
    dataLocals: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.locals,
    dataThreads: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.threads,
    dataBrkPts: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.breakpoints,
    dataMemory: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.memory,
    dataDisasm: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.disassembly,
    dataFunctions: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.functions,
    dataLineVars: MAIN_TO_RENDERER_CHANNEL_GROUPS.debuggerData.lineVars,
  },
  rendererToMain: RENDERER_TO_MAIN_CHANNEL_GROUPS,
  rendererInvoke: {
    getSettings: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.settings,
    getSystemFonts: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.systemFonts,
    getVersionInfo: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.versionInfo,
    getWslDistrobutions: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.environment.wslDistributions,
    getFunctionNames: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.functionNames,
    getVarByName: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.varByName,
    showSourceAt: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.showSourceAt,
  },
  rendererSend: {
    gdbCommand: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.send,
    gdbControlD: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.sendControlD,
    notifyMain: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.app.notify,
    dangerousCommandResponse:
      RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.dangerousCommandResponse,
  },
} as const;

export type DebuggerSelectStackFrameCommand = {
  kind: "select-stack-frame";
  frameLevel: string;
};

export type DebuggerCommand = string | DebuggerSelectStackFrameCommand;

export type NotifyRenderCommand =
  | "theme-changed"
  | "connection-started"
  | "connection-success"
  | "connection-failed"
  | "cancel-connection"
  | "connection-dialog"
  | "command-entry"
  | "about-box"
  | "settings-dialog"
  | "connections-dialog"
  | "sections-view"
  | "confirm-dangerous-command";

export type NotifyRenderMessage = {
  command: NotifyRenderCommand;
  data?: unknown;
};

export type NotifyMainCommand =
  | "connect-selected-connection"
  | "cancel-connection"
  | "command-entry"
  | "save-connections"
  | "save-last-used-connection"
  | "save-app-show-debug-info"
  | "save-app-theme"
  | "save-cmd-history"
  | "save-source-viewer-theme"
  | "save-source-viewer-font-size"
  | "save-source-viewer-font-name"
  | "save-grid-columns"
  | "reset-grid-columns"
  | "save-sections-view-options"
  | "save-auto-symbol-loading"
  | "save-window-bounds"
  | "open-external"
  | "renderStart"
  | "renderEnd";

/**
 * Maps each `NotifyMainCommand` to the shape of its `data` payload.
 * Use this map to derive typed `NotifyMainRequest` variants.
 */
export type NotifyMainPayloadMap = {
  "connect-selected-connection": { connection: NormalizedConnection };
  "cancel-connection": undefined;
  "command-entry": undefined;
  "save-connections": { connections: NormalizedConnection[] };
  "save-last-used-connection": string | null;
  "save-app-show-debug-info": boolean;
  "save-app-theme": string;
  "save-cmd-history": string[];
  "save-source-viewer-theme": string;
  "save-source-viewer-font-size": string | number;
  "save-source-viewer-font-name": string;
  "save-grid-columns": { gridName: GridName; columns: GridColumnState[] };
  "reset-grid-columns": GridName | undefined;
  "save-sections-view-options": SectionsViewOptions;
  "save-auto-symbol-loading": boolean;
  "save-window-bounds": {
    x: number;
    y: number;
    width: number;
    height: number;
    fullscreen: boolean;
  };
  "open-external": string;
  renderStart: undefined;
  renderEnd: undefined;
};

/**
 * Discriminated union of all renderer-to-main notification requests.
 * Each variant carries a strongly-typed `data` payload derived from `NotifyMainPayloadMap`.
 */
export type NotifyMainRequest = {
  [K in keyof NotifyMainPayloadMap]: NotifyMainPayloadMap[K] extends undefined
    ? { command: K; data?: undefined }
    : { command: K; data: NotifyMainPayloadMap[K] };
}[keyof NotifyMainPayloadMap];

export type DangerousCommandEntry = {
  command: string;
  reason?: string;
  defaultAnswer?: "yes" | "no";
};

export type DangerousCommandResponse = {
  allow: boolean;
  remember: boolean;
  answer: "yes" | "no";
};
