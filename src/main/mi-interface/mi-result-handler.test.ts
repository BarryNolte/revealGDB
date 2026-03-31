import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiOutputHost } from "./mi-output-types";
import { MiResultRecordHandler } from "./mi-result-handler";

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

describe("MiResultRecordHandler", () => {
  const createHost = (): MiOutputHost => {
    return {
      gdbDB: new gdbStateDatabase(),
      emit: vi.fn(),
      send: vi.fn(),
    };
  };

  it("parses feature list into state database", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord('^done,features=["foo","bar"]');

    expect(ok).toBe(true);
    expect(host.gdbDB.features.has("foo")).toBe(true);
    expect(host.gdbDB.features.has("bar")).toBe(true);
  });

  it("parses register names and updates UI", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord('^done,register-names=["r0","r1"]');

    expect(ok).toBe(true);
    expect(host.gdbDB.registers.get("0")?.name).toBe("r0");
    expect(host.gdbDB.registers.get("1")?.name).toBe("r1");
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-register", host.gdbDB.registers);
  });

  it("returns false for unknown done-result payload", async () => {
    const handler = new MiResultRecordHandler(createHost());
    const ok = await handler.parseResultRecord("^done,unknown-payload=[]");
    expect(ok).toBe(false);
  });

  it("emits gdb-running for ^running result", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord("^running");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-running", "");
  });

  it("emits gdb-connected for ^connected result", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord("^connected");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-connected", "");
  });

  it("emits gdb-exit for ^exit result", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord("^exit");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("gdb-exit", "");
  });

  it("logs value result from -data-evaluate-expression", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord('^done,value="42"');

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("value="));
  });

  it("logs name result from -var-create", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord('^done,name="var1"');

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("name="));
  });

  it("logs depth result from -stack-info-depth", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord("^done,depth=5");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("depth="));
  });

  it("logs changed-registers result", async () => {
    const host = createHost();
    const handler = new MiResultRecordHandler(host);

    const ok = await handler.parseResultRecord("^done,changed-registers=[0,1,2]");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining("changed-registers="),
    );
  });
});
