import { contextBridge, ipcRenderer } from "electron";
import { GdbAny } from "../common/gdb-common";

/**
 * This should be kept in sync with .\src\preload\interface.d.ts
 * for code completion and better compiler diagnostics.
 */
contextBridge.exposeInMainWorld("ipcToMain", {
  // Commands from Main to Renderer
  consoleMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("console-message", listener);
    return () => {
      ipcRenderer.removeListener("console-message", listener);
    };
  },
  logMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("log-message", listener);
    return () => {
      ipcRenderer.removeListener("log-message", listener);
    };
  },
  errorMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("error-message", listener);
    return () => {
      ipcRenderer.removeListener("error-message", listener);
    };
  },
  debugMessage: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("debug-message", listener);
    return () => {
      ipcRenderer.removeListener("debug-message", listener);
    };
  },
  connectionStatus: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("connection-status", listener);
    return () => {
      ipcRenderer.removeListener("connection-status", listener);
    };
  },
  // General poking of the render process from the main process
  notifyRender: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("notify-render", listener);
    return () => {
      ipcRenderer.removeListener("notify-render", listener);
    };
  },

  // Data transfer from Main to Renderer
  dataRegisters: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-register", listener);
    return () => {
      ipcRenderer.removeListener("data-register", listener);
    };
  },
  stackFrames: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("stack-frames", listener);
    return () => {
      ipcRenderer.removeListener("stack-frames", listener);
    };
  },
  sourceFile: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("source-file", listener);
    return () => {
      ipcRenderer.removeListener("source-file", listener);
    };
  },
  dataLocals: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-locals", listener);
    return () => {
      ipcRenderer.removeListener("data-locals", listener);
    };
  },
  dataThreads: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-threads", listener);
    return () => {
      ipcRenderer.removeListener("data-threads", listener);
    };
  },
  dataBrkPts: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-brkpts", listener);
    return () => {
      ipcRenderer.removeListener("data-brkpts", listener);
    };
  },
  dataMemory: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-memory", listener);
    return () => {
      ipcRenderer.removeListener("data-memory", listener);
    };
  },
  dataDisasm: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-disasm", listener);
    return () => {
      ipcRenderer.removeListener("data-disasm", listener);
    };
  },
  dataFunctions: (callback: GdbAny) => {
    const listener = (_event: Electron.IpcRendererEvent, value: GdbAny) => callback(value);
    ipcRenderer.on("data-disasm-functions", listener);
    return () => {
      ipcRenderer.removeListener("data-disasm-functions", listener);
    };
  },

  // Commands from Renderer to Main
  getSettings: () => ipcRenderer.invoke("getSettings"),
  getSystemFonts: () => ipcRenderer.invoke("getSystemFonts"),
  getVersionInfo: () => ipcRenderer.invoke("getVersionInfo"),
  sendGdbCommand: (command: string) => ipcRenderer.send("gdb-command", command),

  // General poking of the main process by the render process
  notifyMain: (command: GdbAny) => ipcRenderer.send("notify-main", command),
});
