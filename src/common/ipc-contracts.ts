const MAIN_TO_RENDERER_CHANNEL_GROUPS = {
  console: {
    message: "console-message",
    log: "log-message",
    error: "error-message",
    debug: "debug-message",
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
  },
  rendererToMain: RENDERER_TO_MAIN_CHANNEL_GROUPS,
  rendererInvoke: {
    getSettings: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.settings,
    getSystemFonts: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.systemFonts,
    getVersionInfo: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.app.versionInfo,
    getWslDistrobutions: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.environment.wslDistributions,
    getFunctionNames: RENDERER_TO_MAIN_CHANNEL_GROUPS.queries.debugger.functionNames,
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
  | "command-entry"
  | "about-box"
  | "settings-dialog"
  | "connections-dialog";

export type NotifyRenderMessage = {
  command: NotifyRenderCommand;
  data?: unknown;
};

export type NotifyMainCommand =
  | "connect-selected-connection"
  | "cancel-connection"
  | "save-connections"
  | "save-app-show-debug-info"
  | "save-app-theme"
  | "save-cmd-history"
  | "save-source-viewer-theme"
  | "save-source-viewer-font-size"
  | "save-source-viewer-font-name"
  | "save-dock-layout"
  | "renderStart"
  | "renderEnd";

export type NotifyMainRequest = {
  command: NotifyMainCommand;
  data?: unknown;
};
