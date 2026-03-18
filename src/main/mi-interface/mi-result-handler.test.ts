import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiOutputHost } from "./mi-output-types";
import { MiResultRecordHandler } from "./mi-result-handler";

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
    expect(mockWebContents.send).toHaveBeenCalledWith("data-register", host.gdbDB.registers);
  });

  it("returns false for unknown done-result payload", async () => {
    const handler = new MiResultRecordHandler(createHost());
    const ok = await handler.parseResultRecord("^done,unknown-payload=[]");
    expect(ok).toBe(false);
  });
});
