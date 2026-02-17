export interface IElectronAPI {
  consoleMessage: (callback: GdbAny) => () => void;
  logMessage: (callback: GdbAny) => () => void;
  errorMessage: (callback: GdbAny) => () => void;
  debugMessage: (callback: GdbAny) => () => void;
  connectionStatus: (callback: GdbAny) => () => void;
  notifyRender: (callback: GdbAny) => () => void;

  dataRegisters: (callback: GdbAny) => () => void;
  stackFrames: (callback: GdbAny) => () => void;
  sourceFile: (callback: GdbAny) => () => void;
  dataLocals: (callback: GdbAny) => () => void;
  dataThreads: (callback: GdbAny) => () => void;
  dataBrkPts: (callback: (data: Map<string, gdbBreakpoint>) => void) => () => void;
  dataMemory: (callback: GdbAny) => () => void;
  dataDisasm: (callback: GdbAny) => () => void;
  dataFunctions: (callback: GdbAny) => () => void;

  getSettings: () => GdbAny;
  getSystemFonts: () => Promise<string[]>;
  getVersionInfo: () => Promise<Map<string, GdbAny>>;
  sendGdbCommand: (command: string) => void;
  notifyMain: (command: GdbAny) => void;
}

declare global {
  interface Window {
    ipcToMain: IElectronAPI;
  }
}
