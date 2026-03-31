import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiExecAsyncHandler } from "./mi-exec-handler";
import { MiOutputHost } from "./mi-output-types";

const { mockWebContentsSend } = vi.hoisted(() => ({
  mockWebContentsSend: vi.fn(),
}));

vi.mock("../main", async () => {
  const { createMockBrowserWindow } = await import("../../test-helpers/ipc-test-harness.js");

  return {
    mainWindow: createMockBrowserWindow({
      webContents: {
        send: mockWebContentsSend,
      },
    }),
  };
});

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
      '*stopped,reason="exited-signalled",signal-name="SIGSEGV",thread-id="1",stopped-threads="all"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
    expect(mockWebContentsSend).toHaveBeenCalledWith("notify-render", {
      command: "status-stopped",
    });
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

  it("handles stopped with reason exited (non-zero exit code)", () => {
    const host = createHost();
    const handler = new MiExecAsyncHandler(host);

    const ok = handler.parseExecAsyncRecord(
      '*stopped,reason="exited",exit-code="01",thread-id="1",stopped-threads="all"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-stopped");
  });
});
