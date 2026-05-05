/**
 * mi-exec-handler.test module.
 *
 * @remarks
 * Source module for mi-exec-handler.test.
 */

/**
 * @file mi-exec-handler.test.ts
 * @description Source module for mi-exec-handler.test.
 */

import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiExecAsyncHandler } from "../../../../src/main/mi-interface/mi-exec-handler";
import { MiOutputHost } from "../../../../src/main/mi-interface/mi-output-types";

const { mockWebContentsSend } = vi.hoisted(() => ({
  mockWebContentsSend: vi.fn(),
}));

vi.mock("../../../../src/main/ipc-sender", () => ({
  sendToRenderer: mockWebContentsSend,
}));

describe("MiExecAsyncHandler", () => {
  const createHost = (): MiOutputHost => {
    return {
      gdbDB: new gdbStateDatabase(),
      emit: vi.fn(),
      send: vi.fn(),
    };
  };

  it("handles running status", () => {
    const host = createHost();
    host.gdbDB.addThreadGroup("i1");
    host.gdbDB.createThread("1", "i1");
    host.gdbDB.addThread({
      id: "1",
      name: "Thread 1",
      targetId: "Thread 1",
      details: "",
      frame: {
        level: "0",
        addr: "0x0",
        func: "main",
        args: "",
        file: "",
        fullName: "",
        line: "1",
        arch: "",
      },
      state: "stopped",
      active: true,
    });
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord('*running,thread-id="all"');

    expect(ok).toBe(true);
    expect(host.gdbDB.threads.get("1")?.state).toBe("running");
    expect(mockWebContentsSend).toHaveBeenCalledWith("notify-render", {
      command: "status-running",
    });
  });

  it("handles stopped status and emits gdb-stopped", () => {
    const host = createHost();
    host.gdbDB.addThreadGroup("i1");
    host.gdbDB.createThread("1", "i1");
    host.gdbDB.addThread({
      id: "1",
      name: "Thread 1",
      targetId: "Thread 1",
      details: "",
      frame: {
        level: "0",
        addr: "0x0",
        func: "main",
        args: "",
        file: "",
        fullName: "",
        line: "1",
        arch: "",
      },
      state: "running",
      active: true,
    });
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord('*stopped,reason="breakpoint-hit",thread-id="1"');

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
    expect(mockWebContentsSend).toHaveBeenCalledWith("notify-render", {
      command: "status-stopped",
    });
  });

  it("returns false for unknown exec record", () => {
    const handler = new MiExecAsyncHandler(createHost());
    const ok = handler.parseExecAsyncRecord("*not-real,data=value");
    expect(ok).toBe(false);
  });

  it("handles stopped with reason exited-signalled", () => {
    const host = createHost();
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord(
      '*stopped,reason="exited-signalled",signal-name="SIGSEGV",signal-meaning="Segmentation fault",thread-id="1",stopped-threads="all"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('signal-name="SIGSEGV"'),
    );
    expect(mockWebContentsSend).toHaveBeenCalledWith("notify-render", {
      command: "status-stopped",
    });
  });

  it("handles stopped with reason signal-received and extracts signal fields", () => {
    const host = createHost();
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord(
      '*stopped,reason="signal-received",signal-name="SIGINT",signal-meaning="Interrupt",thread-id="1",stopped-threads="all",core="0"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('signal-name="SIGINT"'),
    );
  });

  it("handles stopped with reason exited and extracts exit-code", () => {
    const host = createHost();
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord(
      '*stopped,reason="exited",exit-code="01",thread-id="1",stopped-threads="all"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining('exit-code="01"'));
  });

  it("handles stopped with reason exited-normally", () => {
    const host = createHost();
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord(
      '*stopped,reason="exited-normally",thread-id="1",stopped-threads="all"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
  });
});
