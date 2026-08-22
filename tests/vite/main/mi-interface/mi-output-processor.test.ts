/**
 * mi-output-processor.test module.
 *
 * @remarks
 * Source module for mi-output-processor.test.
 */

/**
 * @file mi-output-processor.test.ts
 * @description Source module for mi-output-processor.test.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiOutputProcessor } from "../../../../src/main/mi-interface/mi-output-processor";
import { MiOutputHost } from "../../../../src/main/mi-interface/mi-output-types";

const { mockWebContentsSend, notifierMock, setNotifierWatching } = vi.hoisted(() => {
  let watchingConsole = false;

  return {
    mockWebContentsSend: vi.fn(),
    notifierMock: {
      notifyGdbStartup: vi.fn(),
      isWatchingConsole: vi.fn(() => watchingConsole),
      endWatchingConsole: vi.fn(() => {
        watchingConsole = false;
      }),
      consoleCapture: vi.fn(),
    },
    setNotifierWatching: (value: boolean) => {
      watchingConsole = value;
    },
  };
});

vi.mock("../../../../src/main/ipc-sender", () => ({
  sendToRenderer: mockWebContentsSend,
}));

vi.mock("../../../../src/main/utilities/ConnectionNotifier", () => ({
  ConnectionNotifier: {
    getInstance: vi.fn(() => notifierMock),
  },
}));

describe("MiOutputProcessor integration", () => {
  const createHost = (): MiOutputHost => ({
    gdbDB: new gdbStateDatabase(),
    emit: vi.fn(),
    send: vi.fn(),
  });

  afterEach(() => {
    vi.clearAllMocks();
    setNotifierWatching(false);
  });

  it("dispatches mixed done payloads across core and strategy handlers", async () => {
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    const mixedDonePayload = [
      '^done,features=["f1","f2"]',
      '^done,register-names=["r0","r1"]',
      '^done,register-values=[{number="0",value="0x0"},{number="1",value="0x1"}]',
      '^done,threads=[{id="1",target-id="Thread 1",details="running",frame={level="0",addr="0x1",func="main",args=[],file="a.c",fullname="/tmp/a.c",line="10",arch="arm"},state="stopped"}],current-thread-id="1"',
      '^done,stack=[frame={level="0",addr="0x1",func="main",file="a.c",fullname="a.c",line="10",arch="arm"},]',
    ].join("\n");

    await processor.handleDataChunk(`${mixedDonePayload}\n`, () => false);

    expect(host.gdbDB.features.has("f1")).toBe(true);
    expect(host.gdbDB.registers.get("0")?.name).toBe("r0");
    expect(host.gdbDB.registers.get("1")?.value).toBe("0x1");
    expect(host.gdbDB.threads.size).toBe(1);
    expect(host.gdbDB.stackFrames[0]?.func).toBe("main");
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "data-threads",
      expect.objectContaining({
        th: host.gdbDB.threads,
      }),
    );
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "source-file",
      expect.objectContaining({
        fileName: "a.c",
        line: "10",
      }),
    );
  });

  it("routes lines to consoleCapture while the notifier is watching", async () => {
    setNotifierWatching(true);
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    await processor.handleDataChunk("waiting for target\n", () => false);

    expect(notifierMock.consoleCapture).toHaveBeenCalledWith(false, "waiting for target");
    expect(host.emit).not.toHaveBeenCalledWith("console-stream", expect.anything());
  });

  it("exits console watch mode when =thread-group-added arrives", async () => {
    setNotifierWatching(true);
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    await processor.handleDataChunk('=thread-group-added,id="i1"\n', () => false);

    expect(notifierMock.endWatchingConsole).toHaveBeenCalledTimes(1);
    expect(notifierMock.notifyGdbStartup).toHaveBeenCalledWith("target-running", "completed");
  });

  it("exits console watch mode when token-prefixed thread-group notify arrives", async () => {
    setNotifierWatching(true);
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    await processor.handleDataChunk('42=thread-group-added,id="i1"\n', () => false);

    expect(notifierMock.endWatchingConsole).toHaveBeenCalledTimes(1);
    expect(notifierMock.notifyGdbStartup).toHaveBeenCalledWith("target-running", "completed");
  });

  it("does not swallow MI control records while console watch is active", async () => {
    setNotifierWatching(true);
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    await processor.handleDataChunk('^done,register-names=["r0"]\n', () => false);

    expect(notifierMock.consoleCapture).not.toHaveBeenCalledWith(
      false,
      '^done,register-names=["r0"]',
    );
    expect(host.gdbDB.registers.get("0")?.name).toBe("r0");
  });

  it("does not swallow the GDB prompt while console capture is active", async () => {
    setNotifierWatching(true);
    const host = createHost();
    const processor = new MiOutputProcessor(host);

    await processor.handleDataChunk("(gdb)\n", () => false);

    expect(notifierMock.consoleCapture).not.toHaveBeenCalledWith(false, "(gdb)");
    expect(host.emit).toHaveBeenCalledWith("gdb-idle");
  });
});
