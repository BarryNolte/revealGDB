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

const { sendMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
}));

vi.mock("../../../src/main/mi-interface/mi-interface", async () => {
  const { EventEmitter } = await import("events");

  class MockMiInterface extends EventEmitter {
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

  it("runs startup commands once and stopped commands on each stop", () => {
    const mainWindow = createMockBrowserWindow();

    const appSettings = createMockAppSettings({
      getSync: vi.fn((key: string) => {
        if (key === "gdb.run.onStartup") {
          return ["startup-one", "startup-two"];
        }
        if (key === "gdb.run.onStopped") {
          return ["stopped-one"];
        }
        return [];
      }),
    });

    const gdb = createGdbInterface(mainWindow as never, appSettings);

    gdb.emit("gdb-stopped");
    gdb.emit("gdb-stopped");

    const calls = sendMock.mock.calls.map((args) => args[0]);

    expect(calls.filter((c) => c === "startup-one")).toHaveLength(1);
    expect(calls.filter((c) => c === "startup-two")).toHaveLength(1);
    expect(calls.filter((c) => c === "stopped-one")).toHaveLength(2);
    expect(calls.filter((c) => c === "echo <<<<file-info>>>>")).toHaveLength(1);
    expect(calls.filter((c) => c === "echo <<<<function-names>>>>")).toHaveLength(1);
  });
});
