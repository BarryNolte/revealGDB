import { contextBridge, ipcRenderer } from "electron";
import { GdbAny } from "../common/gdb-common";

/**
 * This should be kept in sync with .\src\preload\interface.d.ts
 * for code completion and better compiler diagnostics.
 */
contextBridge.exposeInMainWorld("ipcToMain", {
  // Commands from Main to Renderer
  consoleMessage: (callback: GdbAny) =>
    ipcRenderer.on("console-message", (_event, value) => callback(value)),
  logMessage: (callback: GdbAny) =>
    ipcRenderer.on("log-message", (_event, value) => callback(value)),
  errorMessage: (callback: GdbAny) =>
    ipcRenderer.on("error-message", (_event, value) => callback(value)),

  // General poking of the render process from the main process
  notifyRender: (callback: GdbAny) =>
    ipcRenderer.on("notify-render", (_event, value) => callback(value)),

  // Data transfer from Main to Renderer
  dataRegisters: (callback: GdbAny) =>
    ipcRenderer.on("data-register", (_event, value) => callback(value)),
  stackFrames: (callback: GdbAny) =>
    ipcRenderer.on("stack-frames", (_event, value) => callback(value)),
  sourceFile: (callback: GdbAny) =>
    ipcRenderer.on("source-file", (_event, value) => callback(value)),
  dataLocals: (callback: GdbAny) =>
    ipcRenderer.on("data-locals", (_event, value) => callback(value)),
  dataThreads: (callback: GdbAny) =>
    ipcRenderer.on("data-threads", (_event, value) => callback(value)),
  dataBrkPts: (callback: GdbAny) =>
    ipcRenderer.on("data-brkpts", (_event, value) => callback(value)),
  dataMemory: (callback: GdbAny) =>
    ipcRenderer.on("data-memory", (_event, value) => callback(value)),

  // Commands from Renderer to Main
  getSettings: () => ipcRenderer.invoke("getSettings"),
  getSystemFonts: () => ipcRenderer.invoke("getSystemFonts"),
  getVersionInfo: () => ipcRenderer.invoke("getVersionInfo"),
  sendGdbCommand: (command: string) => ipcRenderer.send("gdb-command", command),

  notifyMain: (command: GdbAny) => ipcRenderer.send("notify-main", command),
});
