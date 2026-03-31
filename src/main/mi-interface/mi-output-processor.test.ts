import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiOutputProcessor } from "./mi-output-processor";
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

describe("MiOutputProcessor integration", () => {
  const createHost = (): MiOutputHost => ({
    gdbDB: new gdbStateDatabase(),
    emit: vi.fn(),
    send: vi.fn(),
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
});
