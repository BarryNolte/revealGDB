/**
 * ipc-test-harness module.
 *
 * @remarks
 * Source module for ipc-test-harness.
 */

/**
 * @file ipc-test-harness.ts
 * @description Source module for ipc-test-harness.
 */

import { vi } from "vitest";
import type { GdbAny } from "../../src/common/gdb-common";
import type { IpcRegistrationContext } from "../../src/main/ipc/types";

export type BrowserWindowMock = {
  fullScreen: boolean;
  getBounds: () => { x: number; y: number; width: number; height: number };
  getPosition: () => [number, number];
  getSize: () => [number, number];
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  loadURL: (url: string) => void;
  loadFile: (filePath: string) => void;
  isDestroyed: () => boolean;
  on: (event: string, handler: () => void) => void;
  webContents: {
    send: (channel: string, payload?: unknown) => void;
    setDevToolsWebContents: (webContents: unknown) => void;
    openDevTools: (options: unknown) => void;
  };
};

type BrowserWindowMockOverrides = Omit<Partial<BrowserWindowMock>, "webContents"> & {
  webContents?: Partial<BrowserWindowMock["webContents"]>;
};

type IpcHarnessOptions = {
  mainWindow?: BrowserWindowMockOverrides;
  appSettings?: {
    getSync?: (key: string) => unknown;
    setSync?: (key: string, value: unknown) => void;
    unsetSync?: (key: string) => void;
  };
  gdbInterface?: {
    connect?: ReturnType<typeof vi.fn>;
    disconnect?: ReturnType<typeof vi.fn>;
    send?: ReturnType<typeof vi.fn>;
    runCommand?: ReturnType<typeof vi.fn>;
    gdbDB?: Record<string, ReturnType<typeof vi.fn>>;
  };
  ipcMain?: {
    on?: ReturnType<typeof vi.fn>;
    handle?: ReturnType<typeof vi.fn>;
  };
  fontList?: Map<string, string>;
  gdbAppInfo?: Map<string, GdbAny>;
  isSelectedConnection?: IpcRegistrationContext["isSelectedConnection"];
};

export function createMockAppSettings(
  overrides: {
    getSync?: (key: string) => unknown;
    setSync?: (key: string, value: unknown) => void;
    unsetSync?: (key: string) => void;
  } = {},
) {
  return {
    getSync: vi.fn<(key: string) => unknown>(),
    setSync: vi.fn<(key: string, value: unknown) => void>(),
    unsetSync: vi.fn<(key: string) => void>(),
    ...overrides,
  };
}

export function createMockBrowserWindow(
  overrides: BrowserWindowMockOverrides = {},
): BrowserWindowMock {
  const { webContents: webContentsOverrides, ...windowOverrides } = overrides;

  const defaultWebContents: BrowserWindowMock["webContents"] = {
    send: vi.fn<(channel: string, payload?: unknown) => void>(),
    setDevToolsWebContents: vi.fn<(webContents: unknown) => void>(),
    openDevTools: vi.fn<(options: unknown) => void>(),
  };

  const mergedWebContents: BrowserWindowMock["webContents"] = {
    send: webContentsOverrides?.send ?? defaultWebContents.send,
    setDevToolsWebContents:
      webContentsOverrides?.setDevToolsWebContents ?? defaultWebContents.setDevToolsWebContents,
    openDevTools: webContentsOverrides?.openDevTools ?? defaultWebContents.openDevTools,
  };

  return {
    fullScreen: false,
    getBounds: vi
      .fn<() => { x: number; y: number; width: number; height: number }>()
      .mockReturnValue({ x: 100, y: 200, width: 800, height: 600 }),
    getPosition: vi.fn<() => [number, number]>().mockReturnValue([100, 200]),
    getSize: vi.fn<() => [number, number]>().mockReturnValue([800, 600]),
    setPosition: vi.fn<(x: number, y: number) => void>(),
    setSize: vi.fn<(width: number, height: number) => void>(),
    loadURL: vi.fn<(url: string) => void>(),
    loadFile: vi.fn<(filePath: string) => void>(),
    isDestroyed: vi.fn<() => boolean>().mockReturnValue(false),
    on: vi.fn<(event: string, handler: () => void) => void>(),
    webContents: mergedWebContents,
    ...windowOverrides,
  };
}

export function createIpcRegistrationHarness(options: IpcHarnessOptions = {}) {
  const mainWindow = createMockBrowserWindow(options.mainWindow);

  const appSettings = createMockAppSettings(options.appSettings);

  const gdbInterface = {
    connect: vi.fn().mockReturnValue(true),
    disconnect: vi.fn(),
    send: vi.fn(),
    runCommand: vi.fn(),
    gdbDB: {
      clearDatabase: vi.fn(),
      allDataUpdateUI: vi.fn(),
      dump: vi.fn().mockReturnValue([]),
      getAllFunctionNames: vi.fn().mockReturnValue([]),
      ...options.gdbInterface?.gdbDB,
    },
    ...options.gdbInterface,
  };

  const ipcMain = {
    on: vi.fn(),
    handle: vi.fn(),
    ...options.ipcMain,
  };

  const context: IpcRegistrationContext = {
    ipcMain: ipcMain as never,
    appSettings: appSettings as never,
    fontList: options.fontList ?? new Map<string, string>(),
    gdbAppInfo: (options.gdbAppInfo ?? new Map<string, GdbAny>()) as never,
    getMainWindow: () => mainWindow as never,
    getGdbInterface: () => gdbInterface as never,
    isSelectedConnection:
      options.isSelectedConnection ??
      (((value: unknown) => {
        return Boolean(value);
      }) as IpcRegistrationContext["isSelectedConnection"]),
  };

  return {
    context,
    mainWindow,
    send: mainWindow.webContents.send,
    appSettings,
    gdbInterface,
    ipcMain,
  };
}
