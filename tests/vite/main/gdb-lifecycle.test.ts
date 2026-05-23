/**
 * gdb-lifecycle.test module.
 *
 * @remarks
 * Source module for gdb-lifecycle.test.
 */

/**
 * @file gdb-lifecycle.test.ts
 * @description Source module for gdb-lifecycle.test.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGdbInterface } from "../../../src/main/gdb-lifecycle";
import { createMockAppSettings, createMockBrowserWindow } from "../../helpers/ipc-test-harness";

const defaultStartupCommands = ["-list-features", "-data-list-register-names"];
const defaultStoppedCommands = [
  "-data-list-register-values x",
  "-stack-list-frames",
  "-stack-list-locals 1",
  "-thread-info",
];

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("../../../src/main/mi-interface/mi-interface", async () => {
  const { EventEmitter } = await import("events");

  class MockMiInterface extends EventEmitter {
    onStartup = [...defaultStartupCommands];
    onStopped = [...defaultStoppedCommands];
    send = sendMock;
    runCommand = sendMock;
    gdbDB = {
      gdbSrcFileCache: new EventEmitter(),
      hasLineVars: () => false,
    };
  }

  return {
    miInterface: MockMiInterface,
  };
});

describe("createGdbInterface", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("runs built-in startup commands once and built-in stopped commands on each stop", () => {
    const mainWindow = createMockBrowserWindow();

    const appSettings = createMockAppSettings();

    const gdb = createGdbInterface(mainWindow as never, appSettings);

    gdb.emit("gdb-stopped");
    gdb.emit("gdb-stopped");

    const calls = sendMock.mock.calls.map((args) => args[0]);

    for (const command of defaultStartupCommands) {
      expect(calls.filter((call) => call === command)).toHaveLength(1);
    }

    for (const command of defaultStoppedCommands) {
      expect(calls.filter((call) => call === command)).toHaveLength(2);
    }

    expect(calls.filter((c) => c.startsWith("echo <<<<file-info>>>>"))).toHaveLength(1);
    expect(calls.filter((c) => c.startsWith("echo <<<<function-names>>>>"))).toHaveLength(1);
    expect(appSettings.getSync).not.toHaveBeenCalled();
  });

  it("forwards CONSOLE_STREAM to mainWindow.webContents.send", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    gdb.emit("console-stream", "hello console");
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("console-message", "hello console");
  });

  it("forwards LOG_STREAM to mainWindow.webContents.send", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    gdb.emit("log-stream", "log line");
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("log-message", "log line");
  });

  it("forwards ERROR_STREAM to mainWindow.webContents.send", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    gdb.emit("error-stream", "some error");
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("error-message", "some error");
  });

  it("forwards DEBUG_STREAM to mainWindow.webContents.send", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    gdb.emit("debug-stream", "debug info");
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("debug-message", "debug info");
  });

  it("forwards HTML_STREAM to mainWindow.webContents.send", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    gdb.emit("html-stream", "<b>html</b>");
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("html-message", "<b>html</b>");
  });

  it("skips maint print symbols command when hasLineVars returns true", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());

    // Override hasLineVars to return true for this test
    (gdb.gdbDB as { hasLineVars: (f: string) => boolean }).hasLineVars = () => true;
    sendMock.mockClear();

    gdb.gdbDB.gdbSrcFileCache.emit("first-read", "myfile.c");

    const calls = sendMock.mock.calls.map((a) => a[0] as string);
    expect(calls.some((c) => (c as string).includes("maint print symbols"))).toBe(false);
  });

  it("runs maint print symbols command when hasLineVars returns false", () => {
    const mainWindow = createMockBrowserWindow();
    const gdb = createGdbInterface(mainWindow as never, createMockAppSettings());
    sendMock.mockClear();

    gdb.gdbDB.gdbSrcFileCache.emit("first-read", "target.c");

    const calls = sendMock.mock.calls.map((a) => a[0] as string);
    expect(calls.some((c) => (c as string).includes("maint print symbols"))).toBe(true);
  });
});
