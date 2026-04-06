import { beforeEach, describe, expect, it, vi } from "vitest";
import { ElectronUINotifier } from "../../../../../../src/main/mi-interface/gdb-state-database/notifiers/ElectronUINotifier";

const { mockWebContentsSend } = vi.hoisted(() => ({
  mockWebContentsSend: vi.fn(),
}));

vi.mock("../../../../../../src/main/main", async () => {
  const { createMockBrowserWindow } = await import("../../../../../helpers/ipc-test-harness.js");

  return {
    mainWindow: createMockBrowserWindow({
      webContents: {
        send: mockWebContentsSend,
      },
    }),
  };
});

describe("ElectronUINotifier", () => {
  beforeEach(() => {
    mockWebContentsSend.mockClear();
  });

  it("sends locals payloads to the locals channel", () => {
    const notifier = new ElectronUINotifier();
    const locals = {
      locals: [{ exp: "counter", name: "counter", type: "int", value: "7", variablesReference: 0 }],
    };

    notifier.sendLocals(locals as never);

    expect(mockWebContentsSend).toHaveBeenCalledWith("data-locals", locals.locals);
  });

  it("sends undefined locals when no locals container exists", () => {
    const notifier = new ElectronUINotifier();

    notifier.sendLocals(undefined);

    expect(mockWebContentsSend).toHaveBeenCalledWith("data-locals", undefined);
  });

  it("maps stack frame, breakpoint, register, and source notifications to their channels", () => {
    const notifier = new ElectronUINotifier();
    const frames = [
      {
        active: true,
        level: "0",
        func: "main",
        addr: "0x1000",
        args: "",
        file: "main.c",
        fullName: "/tmp/main.c",
        line: "12",
        from: "",
        arch: "arm",
      },
    ];
    const breakpoints = new Map([
      [
        "1",
        {
          number: "1",
          type: "breakpoint",
          disp: "keep",
          enabled: "y",
          addr: "0x1000",
          func: "main",
          file: "main.c",
          fullname: "/tmp/main.c",
          line: "12",
          tg: "i1",
          times: "0",
          installed: "y",
          orgloc: "main.c:12",
        },
      ],
    ]);
    const registers = new Map([["0", { name: "r0", value: "0x0", changed: false }]]);
    const sourceInfo = { fileName: "main.c", line: "12", contents: "int main() {}" };

    notifier.sendStackFrames(frames);
    notifier.sendBreakpoints(breakpoints);
    notifier.sendRegisters(registers);
    notifier.sendSourceFile(sourceInfo);

    expect(mockWebContentsSend).toHaveBeenNthCalledWith(1, "stack-frames", frames);
    expect(mockWebContentsSend).toHaveBeenNthCalledWith(2, "data-brkpts", breakpoints);
    expect(mockWebContentsSend).toHaveBeenNthCalledWith(3, "data-register", registers);
    expect(mockWebContentsSend).toHaveBeenNthCalledWith(4, "source-file", sourceInfo);
  });

  it("packages threads and groups into the thread channel payload", () => {
    const notifier = new ElectronUINotifier();
    const threads = new Map([
      [
        "1",
        {
          active: true,
          id: "1",
          targetId: "Thread 1",
          details: "stopped",
          name: "Thread 1",
          state: "stopped",
          frame: {
            active: false,
            level: "0",
            func: "main",
            addr: "0x1000",
            args: "",
            file: "main.c",
            fullName: "/tmp/main.c",
            line: "12",
            from: "",
            arch: "arm",
          },
        },
      ],
    ]);
    const groups = new Map([["i1", { gid: "i1", threads: new Map([["1", "1"]]) }]]);

    notifier.sendThreads(threads, groups);

    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", {
      th: threads,
      grp: groups,
    });
  });
});
