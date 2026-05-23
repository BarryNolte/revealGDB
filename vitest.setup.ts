/**
 * Vitest setup file for mocking Electron and other Node-only modules
 */

import { vi } from "vitest";

// Mock the Electron app module
vi.mock("electron", () => ({
  app: {
    on: vi.fn(),
    getPath: vi.fn(() => "/mock/path"),
    getVersion: vi.fn(() => "1.0.0"),
  },
  BrowserWindow: vi.fn(),
  Menu: { buildFromTemplate: vi.fn() },
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn(),
  },
  screen: {
    getAllDisplays: vi.fn(() => []),
  },
  shell: {
    openExternal: vi.fn(() => Promise.resolve()),
  },
}));

// Mock main.ts to provide a mainWindow object
vi.mock("./src/main/main", () => ({
  mainWindow: {
    webContents: {
      send: vi.fn(),
    },
  },
  isDebug: false,
  isMac: false,
  isWin: true,
  isLinux: false,
  gdbAppInfo: new Map(),
  gdbInterface: {
    gdbDB: {
      stackFrames: [],
      breakpointList: vi.fn(() => []),
      registerList: vi.fn(() => []),
      gdbFunctionNames: new Map(),
    },
  },
}));
