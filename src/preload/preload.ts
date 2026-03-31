import { contextBridge, ipcRenderer } from "electron";
import { GdbAny } from "../common/gdb-common";
import { IPC_CHANNELS, NotifyMainRequest } from "../common/ipc-contracts";

function subscribe(channel: string, callback: GdbAny) {
  const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

function invoke(channel: string) {
  return ipcRenderer.invoke(channel);
}

function send(channel: string, value: unknown) {
  ipcRenderer.send(channel, value);
}

/**
 * Preload script for Electron renderer process.
 *
 * This script runs in a privileged context before the renderer process loads.
 * It uses contextBridge to safely expose IPC communication methods to the renderer.
 *
 * IMPORTANT: This implementation must be kept in sync with ./src/preload/interface.d.ts
 * for proper TypeScript type checking and code completion in the renderer process.
 *
 * Security: contextBridge provides isolation between the privileged Node.js context
 * and the renderer process, preventing direct access to Node.js APIs while allowing
 * controlled communication via the exposed ipcToMain API.
 */
const ipcApi = {
  messages: {
    console: (callback: GdbAny) => subscribe(IPC_CHANNELS.mainToRenderer.console.message, callback),
    log: (callback: GdbAny) => subscribe(IPC_CHANNELS.mainToRenderer.console.log, callback),
    error: (callback: GdbAny) => subscribe(IPC_CHANNELS.mainToRenderer.console.error, callback),
    debug: (callback: GdbAny) => subscribe(IPC_CHANNELS.mainToRenderer.console.debug, callback),
  },
  notifications: {
    connectionStatus: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.notifications.connectionStatus, callback),
    render: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.notifications.render, callback),
  },
  debuggerData: {
    registers: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.registers, callback),
    stackFrames: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.stackFrames, callback),
    sourceFile: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.sourceFile, callback),
    locals: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.locals, callback),
    threads: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.threads, callback),
    breakpoints: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.breakpoints, callback),
    memory: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.memory, callback),
    disassembly: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.disassembly, callback),
    functions: (callback: GdbAny) =>
      subscribe(IPC_CHANNELS.mainToRenderer.debuggerData.functions, callback),
  },
  queries: {
    app: {
      getSettings: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.settings),
      getSystemFonts: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.systemFonts),
      getVersionInfo: () => invoke(IPC_CHANNELS.rendererToMain.queries.app.versionInfo),
    },
    environment: {
      getWslDistrobutions: () =>
        invoke(IPC_CHANNELS.rendererToMain.queries.environment.wslDistributions),
    },
    debugger: {
      getFunctionNames: () => invoke(IPC_CHANNELS.rendererToMain.queries.debugger.functionNames),
    },
  },
  commands: {
    debugger: {
      sendGdbCommand: (command: string) =>
        send(IPC_CHANNELS.rendererToMain.commands.debugger.send, command),
    },
    app: {
      notifyMain: (command: NotifyMainRequest) =>
        send(IPC_CHANNELS.rendererToMain.commands.app.notify, command),
    },
  },
};

contextBridge.exposeInMainWorld("ipcToMain", {
  ...ipcApi,
  consoleMessage: ipcApi.messages.console,
  logMessage: ipcApi.messages.log,
  errorMessage: ipcApi.messages.error,
  debugMessage: ipcApi.messages.debug,
  connectionStatus: ipcApi.notifications.connectionStatus,
  notifyRender: ipcApi.notifications.render,
  dataRegisters: ipcApi.debuggerData.registers,
  stackFrames: ipcApi.debuggerData.stackFrames,
  sourceFile: ipcApi.debuggerData.sourceFile,
  dataLocals: ipcApi.debuggerData.locals,
  dataThreads: ipcApi.debuggerData.threads,
  dataBrkPts: ipcApi.debuggerData.breakpoints,
  dataMemory: ipcApi.debuggerData.memory,
  dataDisasm: ipcApi.debuggerData.disassembly,
  dataFunctions: ipcApi.debuggerData.functions,
  getSettings: ipcApi.queries.app.getSettings,
  getSystemFonts: ipcApi.queries.app.getSystemFonts,
  getVersionInfo: ipcApi.queries.app.getVersionInfo,
  getWslDistrobutions: ipcApi.queries.environment.getWslDistrobutions,
  getFunctionNames: ipcApi.queries.debugger.getFunctionNames,
  sendGdbCommand: ipcApi.commands.debugger.sendGdbCommand,
  notifyMain: ipcApi.commands.app.notifyMain,
});
