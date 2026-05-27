/**
 * Shared IPC mock initialization utilities for renderer test pages.
 */

/**
 * Creates (or retrieves existing) window.ipcToMain mock and initializes all channels
 * with no-op handlers. Returns the ipc object for further customization.
 */
export function initIpcMock(): Window["ipcToMain"] {
  const ipc = window.ipcToMain ?? ({} as Window["ipcToMain"]);
  if (!window.ipcToMain) {
    Object.defineProperty(window, "ipcToMain", {
      value: ipc,
      configurable: true,
      writable: true,
    });
  }
  ipc.messages = {
    console: () => () => undefined,
    log: () => () => undefined,
    error: () => () => undefined,
    debug: () => () => undefined,
    html: () => () => undefined,
  };
  ipc.notifications = {
    connectionStatus: () => () => undefined,
    render: () => () => undefined,
    themeChanged: () => () => undefined,
  };
  ipc.debuggerData = {
    registers: () => () => undefined,
    stackFrames: () => () => undefined,
    sourceFile: () => () => undefined,
    locals: () => () => undefined,
    threads: () => () => undefined,
    breakpoints: () => () => undefined,
    memory: () => () => undefined,
    disassembly: () => () => undefined,
    functions: () => () => undefined,
  };
  ipc.queries = {
    app: {
      getSettings: () => Promise.resolve({}),
      getSystemFonts: () => Promise.resolve([]),
      getVersionInfo: () => Promise.resolve(new Map()),
    },
    environment: {
      getWslDistrobutions: () => Promise.resolve([]),
    },
    debugger: {
      getFunctionNames: () => Promise.resolve([]),
    },
  };
  ipc.commands = {
    debugger: {
      sendGdbCommand: () => undefined,
      sendControlD: () => undefined,
    },
    app: {
      notifyMain: () => undefined,
    },
  };
  return ipc;
}

/**
 * Sets all legacy alias properties on the ipc mock to point to their corresponding
 * channel methods. Call this AFTER all custom channel overrides are in place.
 */
export function setIpcFullLegacyAliases(ipc: Window["ipcToMain"]): void {
  ipc.consoleMessage = ipc.messages.console;
  ipc.logMessage = ipc.messages.log;
  ipc.errorMessage = ipc.messages.error;
  ipc.debugMessage = ipc.messages.debug;
  ipc.htmlMessage = ipc.messages.html;
  ipc.connectionStatus = ipc.notifications.connectionStatus;
  ipc.notifyRender = ipc.notifications.render;
  ipc.dataRegisters = ipc.debuggerData.registers;
  ipc.stackFrames = ipc.debuggerData.stackFrames;
  ipc.sourceFile = ipc.debuggerData.sourceFile;
  ipc.dataLocals = ipc.debuggerData.locals;
  ipc.dataThreads = ipc.debuggerData.threads;
  ipc.dataBrkPts = ipc.debuggerData.breakpoints;
  ipc.dataMemory = ipc.debuggerData.memory;
  ipc.dataDisasm = ipc.debuggerData.disassembly;
  ipc.dataFunctions = ipc.debuggerData.functions;
  ipc.getSettings = ipc.queries.app.getSettings;
  ipc.getSystemFonts = ipc.queries.app.getSystemFonts;
  ipc.getVersionInfo = ipc.queries.app.getVersionInfo;
  ipc.getWslDistrobutions = ipc.queries.environment.getWslDistrobutions;
  ipc.getFunctionNames = ipc.queries.debugger.getFunctionNames;
  ipc.sendGdbCommand = ipc.commands.debugger.sendGdbCommand;
  ipc.sendControlD = ipc.commands.debugger.sendControlD;
  ipc.notifyMain = ipc.commands.app.notifyMain;
}
