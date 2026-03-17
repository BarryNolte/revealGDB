import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGdbInterface } from "./gdb-lifecycle";

const sendMock = vi.fn();

vi.mock("./mi-interface/mi-interface", () => {
  class MockMiInterface extends EventEmitter {
    send = sendMock;
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
    const mainWindow = {
      webContents: {
        send: vi.fn(),
      },
    };

    const appSettings = {
      getSync: vi.fn((key: string) => {
        if (key === "gdb.run.onStartup") {
          return ["startup-one", "startup-two"];
        }
        if (key === "gdb.run.onStopped") {
          return ["stopped-one"];
        }
        return [];
      }),
    };

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
