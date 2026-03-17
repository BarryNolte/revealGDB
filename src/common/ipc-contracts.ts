export const IPC_CHANNELS = {
  mainToRenderer: {
    consoleMessage: "console-message",
    logMessage: "log-message",
    errorMessage: "error-message",
    debugMessage: "debug-message",
    connectionStatus: "connection-status",
    notifyRender: "notify-render",
    dataRegisters: "data-register",
    stackFrames: "stack-frames",
    sourceFile: "source-file",
    dataLocals: "data-locals",
    dataThreads: "data-threads",
    dataBrkPts: "data-brkpts",
    dataMemory: "data-memory",
    dataDisasm: "data-disasm",
    dataFunctions: "data-disasm-functions",
    themeChanged: "theme-changed",
  },
  rendererInvoke: {
    getSettings: "getSettings",
    getSystemFonts: "getSystemFonts",
    getVersionInfo: "getVersionInfo",
    getWslDistrobutions: "getWslDistrobutions",
    getFunctionNames: "getFunctionNames",
  },
  rendererSend: {
    gdbCommand: "gdb-command",
    notifyMain: "notify-main",
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
  | "save-main-theme"
  | "save-dock-layout"
  | "renderStart"
  | "renderEnd";

export type NotifyMainRequest = {
  command: NotifyMainCommand;
  data?: unknown;
};
