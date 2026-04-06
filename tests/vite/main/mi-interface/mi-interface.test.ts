/**
 * Unit tests for miInterface class
 * Tests GDB MI output parsing and event emission
 */

import { EventEmitter } from "events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GdbAny } from "../../../../src/common/gdb-common";
import { miInterface } from "../../../../src/main/mi-interface/mi-interface";

// Mock the external dependencies
vi.mock("../../../../src/main/utilities/ConnectionNotifier", () => ({
  ConnectionNotifier: {
    getInstance: vi.fn(() => ({
      startWatchingConsole: vi.fn(),
      isWatchingConsole: vi.fn(() => false),
      endWatchingConsole: vi.fn(),
      consoleCapture: vi.fn(),
    })),
  },
}));

// Use vi.hoisted() to ensure these mocks are initialized before vi.mock() calls
const { mockSettings, mockWebContents, mockConnectorFactory } = vi.hoisted(() => ({
  mockSettings: {
    getSync: vi.fn(() => false),
  },
  mockWebContents: {
    send: vi.fn(),
  },
  mockConnectorFactory: vi.fn(),
}));

vi.mock("../../../../src/main/mi-interface/gdb-connector/gdb-connector-general", () => ({
  gdbConnectorIdfOnWsl: vi.fn(function () {
    return mockConnectorFactory();
  }),
}));

vi.mock("../../../../src/main/main", async () => {
  const { createMockBrowserWindow } =
    await import("../../../helpers/ipc-test-harness.js");

  return {
    AppSettings: mockSettings,
    mainWindow: createMockBrowserWindow({
      webContents: {
        send: mockWebContents.send,
      },
    }),
  };
});

vi.mock("../../../../src/main/mi-interface/gdb-parsers/gdb-output-capture", () => ({
  GdbOutputCapture: vi.fn(function (this: GdbAny) {
    this.CaptureLine = vi.fn(() => false);
  }),
}));

describe("miInterface", () => {
  let miInterface_instance: miInterface;
  let mockConnector: EventEmitter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebContents.send.mockClear();
    mockSettings.getSync.mockReturnValue(false);
    miInterface_instance = new miInterface();
    mockConnector = new EventEmitter();
    (mockConnector as GdbAny).Send = vi.fn();
    (mockConnector as GdbAny).Start = vi.fn().mockReturnValue(true);
    mockConnectorFactory.mockReset();
    mockConnectorFactory.mockReturnValue(mockConnector as GdbAny);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with empty state", () => {
      expect(miInterface_instance).toBeDefined();
      expect(miInterface_instance.gdbDB).toBeDefined();
    });

    it("should be an EventEmitter", () => {
      expect(miInterface_instance).toBeInstanceOf(EventEmitter);
    });

    it("should forward gdbDB error-stream events", () => {
      const listener = vi.fn();
      miInterface_instance.on("error-stream", listener);

      miInterface_instance.gdbDB.emit("error-stream", "db-error");

      expect(listener).toHaveBeenCalledWith("db-error");
    });
  });

  describe("parseRawOutput", () => {
    it("should handle empty output", async () => {
      const result = await miInterface_instance["parseRawOutput"]("");
      expect(result).toBe(true);
    });

    it("should route console stream output (~)", async () => {
      const output = '~"test message\\n"';
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should route target stream output (@)", async () => {
      const output = '@"target output\\n"';
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should route log stream output (&)", async () => {
      const output = '&"log message\\n"';
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should route result record output (^)", async () => {
      const output = "^done";
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should route exec async record output (*)", async () => {
      const output = "*stopped";
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should route notify async record output (=)", async () => {
      const output = "=thread-created";
      const result = await miInterface_instance["parseRawOutput"](output);
      expect(result).toBe(true);
    });

    it("should emit gdb-idle on (gdb) prompt", async () => {
      const listener = vi.fn();
      miInterface_instance.on("gdb-idle", listener);
      await miInterface_instance["parseRawOutput"]("(gdb)");
      expect(listener).toHaveBeenCalled();
    });

    it("should handle unknown output types", async () => {
      const result = await miInterface_instance["parseRawOutput"]("unknown");
      expect(result).toBe(false);
    });
  });

  describe("parseConsoleStream", () => {
    it("should parse single-line console output", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      miInterface_instance["parseConsoleStream"]('~"hello\\n"');
      expect(listener).toHaveBeenCalledWith("hello");
    });

    it("should parse multi-line console output", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      miInterface_instance["parseConsoleStream"]('~"line1\\nline2\\n"');
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenNthCalledWith(1, "line1");
      expect(listener).toHaveBeenNthCalledWith(2, "line2");
    });

    it("should handle escaped quotes", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      miInterface_instance["parseConsoleStream"]('~"\\"quoted\\"\\n"');
      expect(listener).toHaveBeenCalledWith('"quoted"');
    });

    it("should handle escaped tabs", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      miInterface_instance["parseConsoleStream"]('~"col1\\tcol2\\n"');
      expect(listener).toHaveBeenCalledWith("col1\tcol2");
    });

    it("should accumulate partial lines", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      // First call with no newline terminator
      miInterface_instance["parseConsoleStream"]('~"partial"');
      expect(listener).not.toHaveBeenCalled();
      // Second call adds more text with terminator
      miInterface_instance["parseConsoleStream"]('~" line\\n"');
      expect(listener).toHaveBeenCalledWith("partial line");
    });
  });

  describe("parseLogStream", () => {
    it("should parse log stream output", () => {
      const listener = vi.fn();
      miInterface_instance.on("log-stream", listener);
      miInterface_instance["parseLogStream"]('&"log entry\\n"');
      expect(listener).toHaveBeenCalledWith("log entry");
    });

    it("should parse multi-line log stream", () => {
      const listener = vi.fn();
      miInterface_instance.on("log-stream", listener);
      miInterface_instance["parseLogStream"]('&"line1\\nline2\\n"');
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should not emit for non-terminated lines", () => {
      const listener = vi.fn();
      miInterface_instance.on("log-stream", listener);
      miInterface_instance["parseLogStream"]('&"incomplete');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("parseTargetStream", () => {
    it("should emit log-error event", () => {
      const listener = vi.fn();
      miInterface_instance.on("log-error", listener);
      const result = miInterface_instance["parseTargetStream"]('@"error"');
      expect(result).toBe(true);
      expect(listener).toHaveBeenCalledWith('Target Stream: @"error"');
    });
  });

  describe("parseResultRecord", () => {
    it("should handle ^done with no data", async () => {
      const result = await miInterface_instance["parseResultRecord"]("^done");
      expect(result).toBe(true);
    });

    it("should handle ^running", async () => {
      const result = await miInterface_instance["parseResultRecord"]("^running");
      expect(result).toBe(true);
    });

    it("should handle ^connected", async () => {
      const result = await miInterface_instance["parseResultRecord"]("^connected");
      expect(result).toBe(true);
    });

    it("should handle ^error with message", async () => {
      const listener = vi.fn();
      miInterface_instance.on("error-stream", listener);
      const errorMsg = '^error,msg="Unknown command: foo"';
      await miInterface_instance["parseResultRecord"](errorMsg);
      expect(listener).toHaveBeenCalled();
    });

    it("should handle ^exit", async () => {
      const result = await miInterface_instance["parseResultRecord"]("^exit");
      expect(result).toBe(true);
    });

    it("should handle features result", async () => {
      const output = '^done,features=["foo","bar","baz"]';
      const result = await miInterface_instance["parseResultRecord"](output);
      expect(result).toBe(true);
      expect(miInterface_instance.gdbDB.features.has("foo")).toBe(true);
      expect(miInterface_instance.gdbDB.features.has("bar")).toBe(true);
      expect(miInterface_instance.gdbDB.features.has("baz")).toBe(true);
    });

    it("should handle register-names result", async () => {
      const output = '^done,register-names=["r0","r1","r2"]';
      const result = await miInterface_instance["parseResultRecord"](output);
      expect(result).toBe(true);
    });

    it("should handle unknown result type", async () => {
      const output = "^done,unknown-type=[]";
      const result = await miInterface_instance["parseResultRecord"](output);
      expect(result).toBe(false);
    });
  });

  describe("parseExecAsyncRecord", () => {
    it("should handle *running", () => {
      const result = miInterface_instance["parseExecAsyncRecord"]('*running,thread-id="1"');
      expect(result).toBe(true);
      expect(mockWebContents.send).toHaveBeenCalledWith("notify-render", {
        command: "status-running",
      });
    });

    it("should handle *stopped", () => {
      const data = '*stopped,reason="breakpoint-hit",thread-id="1"';
      const result = miInterface_instance["parseExecAsyncRecord"](data);
      expect(result).toBe(true);
      expect(mockWebContents.send).toHaveBeenCalledWith("notify-render", {
        command: "status-stopped",
      });
    });

    it("should handle *stopped with different reasons", () => {
      const reasons = [
        "end-stepping-range",
        "watchpoint-trigger",
        "signal-received",
        "exited-normally",
      ];

      reasons.forEach((reason) => {
        mockWebContents.send.mockClear();
        const data = `*stopped,reason="${reason}",thread-id="1"`;
        miInterface_instance["parseExecAsyncRecord"](data);
        expect(mockWebContents.send).toHaveBeenCalledWith("notify-render", {
          command: "status-stopped",
        });
      });
    });

    it("should emit gdb-stopped event", () => {
      const listener = vi.fn();
      miInterface_instance.on("gdb-stopped", listener);
      const data = '*stopped,reason="breakpoint-hit",thread-id="1"';
      miInterface_instance["parseExecAsyncRecord"](data);
      expect(listener).toHaveBeenCalled();
    });

    it("should handle unknown exec async record", () => {
      const result = miInterface_instance["parseExecAsyncRecord"]("*unknown,data=value");
      expect(result).toBe(false);
    });
  });

  describe("parseNotifyAsyncRecord", () => {
    it("should handle thread-group-added", async () => {
      const result = await miInterface_instance["parseNotifyAsyncRecord"](
        '=thread-group-added,id="i1"',
      );
      expect(result).toBe(true);
      expect(mockWebContents.send).toHaveBeenCalledWith("data-threads", {
        th: miInterface_instance.gdbDB.threads,
        grp: miInterface_instance.gdbDB.threadGroups,
      });
    });

    it("should handle thread-group-started", async () => {
      const data = '=thread-group-started,id="i1",pid="1234"';
      const result = await miInterface_instance["parseNotifyAsyncRecord"](data);
      expect(result).toBe(true);
      expect(mockWebContents.send).toHaveBeenCalledWith("data-threads", {
        th: miInterface_instance.gdbDB.threads,
        grp: miInterface_instance.gdbDB.threadGroups,
      });
    });

    it("should handle thread-created", async () => {
      const data = '=thread-created,id="1",group-id="i1"';
      const result = await miInterface_instance["parseNotifyAsyncRecord"](data);
      expect(result).toBe(true);
      expect(mockWebContents.send).toHaveBeenCalledWith("data-threads", {
        th: miInterface_instance.gdbDB.threads,
        grp: miInterface_instance.gdbDB.threadGroups,
      });
    });

    it("should handle breakpoint-created", async () => {
      const bkptData =
        "=breakpoint-created," +
        'bkpt={number="1",type="breakpoint",disp="keep",enabled="y",' +
        'addr="0x00400456",func="main",file="test.c",' +
        'fullname="/path/to/test.c",line="3",thread-groups=["i1"],' +
        'times="0",original-location="test.c:3"}';

      const result = await miInterface_instance["parseNotifyAsyncRecord"](bkptData);
      expect(result).toBe(true);
      // Implementation returns a Map (breakpoints), not an Array
      expect(mockWebContents.send).toHaveBeenCalledWith("data-brkpts", expect.any(Map));
    });

    it("should handle unknown notify async record", async () => {
      const result = await miInterface_instance["parseNotifyAsyncRecord"](
        "=unknown-event,data=value",
      );
      expect(result).toBe(false);
    });
  });

  describe("send", () => {
    it("should pass data to connector", () => {
      miInterface_instance["conn"] = mockConnector as GdbAny;
      miInterface_instance.send("test command");
      expect((mockConnector as GdbAny).Send).toHaveBeenCalledWith("test command");
    });

    it("should emit debug-stream when debug mode enabled", () => {
      mockSettings.getSync.mockReturnValue(true);
      const listener = vi.fn();
      miInterface_instance.on("debug-stream", listener);
      miInterface_instance["conn"] = mockConnector as GdbAny;
      miInterface_instance.send("debug command");
      expect(listener).toHaveBeenCalledWith("debug command");
    });

    it("should not emit debug-stream when debug mode disabled", () => {
      mockSettings.getSync.mockReturnValue(false);
      const listener = vi.fn();
      miInterface_instance.on("debug-stream", listener);
      miInterface_instance["conn"] = mockConnector as GdbAny;
      miInterface_instance.send("normal command");
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("streaming and line buffering", () => {
    it("should accumulate incomplete lines across multiple calls", () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);
      // First call with partial data (no newline)
      miInterface_instance["parseConsoleStream"]('~"first"');
      expect(listener).not.toHaveBeenCalled();
      // Second call continues the line (still no newline)
      miInterface_instance["parseConsoleStream"]('~" part"');
      expect(listener).not.toHaveBeenCalled();
      // Third call completes the line with newline terminator
      miInterface_instance["parseConsoleStream"]('~"\\n"');
      expect(listener).toHaveBeenCalledWith("first part");
    });
  });

  describe("event emission", () => {
    it("should emit events on console-stream", () => {
      return new Promise<void>((resolve) => {
        miInterface_instance.on("console-stream", (data: unknown) => {
          expect(data).toBeDefined();
          resolve();
        });
        miInterface_instance["parseConsoleStream"]('~"test\\n"');
      });
    });

    it("should emit events on log-stream", () => {
      return new Promise<void>((resolve) => {
        miInterface_instance.on("log-stream", (data: unknown) => {
          expect(data).toBeDefined();
          resolve();
        });
        miInterface_instance["parseLogStream"]('&"test\\n"');
      });
    });

    it("should emit events on error-stream", () => {
      const listener = vi.fn();
      miInterface_instance.on("log-error", listener);
      miInterface_instance["parseTargetStream"]('@"error"');
      expect(listener).toHaveBeenCalled();
    });

    it("should reassemble split gdb-data chunks before parsing", async () => {
      const listener = vi.fn();
      miInterface_instance.on("console-stream", listener);

      const connected = miInterface_instance.connect({} as GdbAny);
      expect(connected).toBe(true);

      mockConnector.emit("gdb-data", { Output: '~"hello ' });
      mockConnector.emit("gdb-data", { Output: 'world\\n"\n' });

      await Promise.resolve();
      await Promise.resolve();

      expect(listener).toHaveBeenCalledWith("hello world");
    });
  });

  describe("state database integration", () => {
    it("should add features to gdbDB", async () => {
      const initialFeatureCount = miInterface_instance.gdbDB.features.size;
      const output = '^done,features=["feature1","feature2"]';
      await miInterface_instance["parseResultRecord"](output);
      expect(miInterface_instance.gdbDB.features.size).toBeGreaterThan(initialFeatureCount);
    });

    it("should add registers to gdbDB", async () => {
      const output = '^done,register-names=["rax","rbx","rcx"]';
      await miInterface_instance["parseResultRecord"](output);
      expect(miInterface_instance.gdbDB.registers.size).toBeGreaterThan(0);
    });
  });
});
