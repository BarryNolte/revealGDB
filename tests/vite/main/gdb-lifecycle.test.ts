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
import {
  createMockAppSettings,
  createMockBrowserWindow,
} from "../../helpers/ipc-test-harness";

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

    expect(calls.filter((c) => c === "echo <<<<file-info>>>>")).toHaveLength(1);
    expect(calls.filter((c) => c === "echo <<<<function-names>>>>")).toHaveLength(1);
    expect(appSettings.getSync).not.toHaveBeenCalled();
  });
});
