export interface IElectronAPI {
  consoleMessage: (message: GdbAny) => void;
  logMessage: (message: GdbAny) => void;
  errorMessage: (message: GdbAny) => void;
  notifyRender: (command: GdbAny) => void;

  dataRegisters: (data: GdbAny) => void;
  stackFrames: (data: GdbAny) => void;
  sourceFile: (data: GdbAny) => void;
  dataLocals: (data: GdbAny) => void;
  dataThreads: (data: GdbAny) => void;
  dataBrkPts: (data: GdbAny) => void;
  dataMemory: (data: GdbAny) => void;

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
