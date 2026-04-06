/**
 * mi-result-strategies.test module.
 *
 * @remarks
 * Source module for mi-result-strategies.test.
 */

/**
 * @file mi-result-strategies.test.ts
 * @description Source module for mi-result-strategies.test.
 */

import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "../../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiOutputHost } from "../../../../../src/main/mi-interface/mi-output-types";
import { AsmResultStrategy } from "../../../../../src/main/mi-interface/mi-result-strategies/asm-result-strategy";
import { MemoryResultStrategy } from "../../../../../src/main/mi-interface/mi-result-strategies/memory-result-strategy";
import { RegistersResultStrategy } from "../../../../../src/main/mi-interface/mi-result-strategies/registers-result-strategy";
import { StackResultStrategy } from "../../../../../src/main/mi-interface/mi-result-strategies/stack-result-strategy";
import { ThreadsResultStrategy } from "../../../../../src/main/mi-interface/mi-result-strategies/threads-result-strategy";

const { mockWebContentsSend } = vi.hoisted(() => ({
  mockWebContentsSend: vi.fn(),
}));

vi.mock("../../../../../src/main/main", async () => {
  const { createMockBrowserWindow } = await import("../../../../helpers/ipc-test-harness.js");

  return {
    mainWindow: createMockBrowserWindow({
      webContents: {
        send: mockWebContentsSend,
      },
    }),
  };
});

describe("MI result strategies", () => {
  const createHost = (): MiOutputHost => ({
    gdbDB: new gdbStateDatabase(),
    emit: vi.fn(),
    send: vi.fn(),
  });

  it("AsmResultStrategy parses disassembly rows", async () => {
    const host = createHost();
    const strategy = new AsmResultStrategy();
    const output =
      '^done,asm_insns=[address="0x08000100",func-name="main",offset="0",opcodes="00",inst="nop"]';

    const handled = await strategy.handle(host, output, "");

    expect(strategy.canHandle("asm_insns")).toBe(true);
    expect(handled).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "data-disasm",
      expect.arrayContaining([
        expect.objectContaining({
          address: "0x08000100",
          func: "0x08000100-main",
        }),
      ]),
    );
  });

  it("MemoryResultStrategy decodes hex bytes", async () => {
    const host = createHost();
    const strategy = new MemoryResultStrategy();
    const output = '^done,memory=[{begin="0x1000",offset="0",end="0x1004",contents="01020304"}]';

    const handled = await strategy.handle(host, output, "");

    expect(strategy.canHandle("memory")).toBe(true);
    expect(handled).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "data-memory",
      expect.objectContaining({
        begin: "0x1000",
        end: "0x1004",
        data: expect.any(Uint8Array),
      }),
    );
  });

  it("ThreadsResultStrategy stores thread list and emits UI update", async () => {
    const host = createHost();
    const strategy = new ThreadsResultStrategy();
    const resList =
      '[{id="1",target-id="Thread 1",details="running",frame={level="0",addr="0x1",func="main",args=[],file="a.c",fullname="/tmp/a.c",line="10",arch="arm"},state="stopped"}],current-thread-id="1"';

    const handled = await strategy.handle(host, "", resList);

    expect(strategy.canHandle("threads")).toBe(true);
    expect(handled).toBe(true);
    expect(host.gdbDB.threads.size).toBe(1);
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "data-threads",
      expect.objectContaining({
        th: host.gdbDB.threads,
      }),
    );
  });

  it("RegistersResultStrategy handles names and values", async () => {
    const host = createHost();
    const strategy = new RegistersResultStrategy();

    const handledNames = await strategy.handle(host, "", '["r0","r1"]');
    const handledValues = await strategy.handle(
      host,
      "",
      '[{number="0",value="0x0"},{number="1",value="0x1"}]',
    );

    expect(strategy.canHandle("register-names")).toBe(true);
    expect(strategy.canHandle("register-values")).toBe(true);
    expect(handledNames).toBe(true);
    expect(handledValues).toBe(true);
    expect(host.gdbDB.registers.get("0")?.name).toBe("r0");
    expect(host.gdbDB.registers.get("1")?.value).toBe("0x1");
  });

  it("StackResultStrategy stores frames and publishes source file", async () => {
    const host = createHost();
    const strategy = new StackResultStrategy();
    const resList =
      '[frame={level="0",addr="0x1",func="main",file="a.c",fullname="a.c",line="10",arch="arm"},]';

    const handled = await strategy.handle(host, "", resList);

    expect(strategy.canHandle("stack")).toBe(true);
    expect(handled).toBe(true);
    expect(host.gdbDB.stackFrames[0]?.active).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith(
      "source-file",
      expect.objectContaining({
        fileName: "a.c",
        line: "10",
      }),
    );
  });

  it("StackResultStrategy matches frames when file/fullname/line are absent", async () => {
    const host = createHost();
    const strategy = new StackResultStrategy();
    const resList = '[frame={level="0",addr="0x1",func="main",arch="arm"}]';

    const handled = await strategy.handle(host, "", resList);

    expect(handled).toBe(true);
    expect(host.gdbDB.stackFrames).toHaveLength(1);
    expect(host.gdbDB.stackFrames[0]?.func).toBe("main");
    expect(host.gdbDB.stackFrames[0]?.file).toBe("");
    expect(host.gdbDB.stackFrames[0]?.fullName).toBe("");
    expect(host.gdbDB.stackFrames[0]?.line).toBe("");
  });

  it("StackResultStrategy safely handles an empty frame list", async () => {
    const host = createHost();
    const strategy = new StackResultStrategy();
    const sourceFileCallCount = mockWebContentsSend.mock.calls.filter(
      (call) => call[0] === "source-file",
    ).length;

    const handled = await strategy.handle(host, "", "[]");

    expect(handled).toBe(true);
    expect(host.gdbDB.stackFrames).toHaveLength(0);
    expect(mockWebContentsSend.mock.calls.filter((call) => call[0] === "source-file").length).toBe(
      sourceFileCallCount,
    );
  });
});
