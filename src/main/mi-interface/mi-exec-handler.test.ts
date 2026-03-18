import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiExecAsyncHandler } from "./mi-exec-handler";
import { MiOutputHost } from "./mi-output-types";

const { mockWebContents } = vi.hoisted(() => ({
  mockWebContents: {
    send: vi.fn(),
  },
}));

vi.mock("../main", () => ({
  mainWindow: {
    webContents: mockWebContents,
  },
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
    expect(mockWebContents.send).toHaveBeenCalledWith("notify-render", {
      command: "status-running",
    });
  });

  it("handles stopped status and emits gdb-stopped", () => {
    const host = createHost();
    host.gdbDB.addThreadGroup("i1");
    host.gdbDB.createThread("1", "i1");
    host.gdbDB.addThread({
      id: "1",
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
    expect(mockWebContents.send).toHaveBeenCalledWith("notify-render", {
      command: "status-stopped",
    });
  });

  it("returns false for unknown exec record", () => {
    const handler = new MiExecAsyncHandler(createHost());
    const ok = handler.parseExecAsyncRecord("*not-real,data=value");
    expect(ok).toBe(false);
  });
});
