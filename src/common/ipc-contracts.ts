/**
 * Implements ipc contracts for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `IPC_CHANNELS`, `NotifyRenderCommand`, `NotifyRenderMessage`, `NotifyMainCommand`, `NotifyMainRequest`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
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
    },
  },
  commands: {
    debugger: {
      send: "gdb-command",
    },
    app: {
      notify: "notify-main",
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
  },
  rendererSend: {
    gdbCommand: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.debugger.send,
    notifyMain: RENDERER_TO_MAIN_CHANNEL_GROUPS.commands.app.notify,
  },
} as const;

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
  | "sections-view";

export type NotifyRenderMessage = {
  command: NotifyRenderCommand;
  data?: unknown;
};

export type NotifyMainCommand =
  | "connect-selected-connection"
  | "cancel-connection"
  | "show-source-at"
  | "command-entry"
  | "save-connections"
  | "save-last-used-connection"
  | "save-app-show-debug-info"
  | "save-app-theme"
  | "save-cmd-history"
  | "save-source-viewer-theme"
  | "save-source-viewer-font-size"
  | "save-source-viewer-font-name"
  | "save-dock-layout"
  | "save-grid-columns"
  | "reset-grid-columns"
  | "save-sections-view-options"
  | "open-external"
  | "renderStart"
  | "renderEnd";

export type NotifyMainRequest = {
  command: NotifyMainCommand;
  data?: unknown;
};
