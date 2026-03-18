import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiNotifyAsyncHandler } from "./mi-notify-handler";
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

describe("MiNotifyAsyncHandler", () => {
  const createHost = (): MiOutputHost => {
    return {
      gdbDB: new gdbStateDatabase(),
      emit: vi.fn(),
      send: vi.fn(),
    };
  };

  it("handles thread-group-added", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord('=thread-group-added,id="i1"');

    expect(ok).toBe(true);
    expect(host.gdbDB.threadGroups.has("i1")).toBe(true);
    expect(mockWebContents.send).toHaveBeenCalledWith("data-threads", {
      th: host.gdbDB.threads,
      grp: host.gdbDB.threadGroups,
    });
  });

  it("handles cmd-param-changed", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=cmd-param-changed,param="pagination",value="off"',
    );

    expect(ok).toBe(true);
    expect(host.gdbDB.getParam("pagination")?.value).toBe("off");
  });

  it("returns false for unknown notify command", async () => {
    const handler = new MiNotifyAsyncHandler(createHost());
    const ok = await handler.parseNotifyAsyncRecord("=not-real,data=value");
    expect(ok).toBe(false);
  });
});
