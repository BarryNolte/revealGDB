import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "./gdb-state-database/gdbStateDatabase";
import { MiNotifyAsyncHandler } from "./mi-notify-handler";
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
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", {
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

  it("handles =library-loaded and logs parsed fields", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=library-loaded,id="/lib/libc.so.6",target-name="/lib/libc.so.6",host-name="/lib/libc.so.6",symbols-loaded="0",thread-group="i1",ranges=[{from="0x1000",to="0x2000"}]',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('id="/lib/libc.so.6"'),
    );
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('thread-group="i1"'),
    );
  });

  it("handles =library-unloaded and logs parsed fields", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=library-unloaded,id="/lib/libc.so.6",target-name="/lib/libc.so.6",host-name="/lib/libc.so.6",thread-group="i1"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('id="/lib/libc.so.6"'),
    );
  });

  it("handles =memory-changed without type", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=memory-changed,thread-group=i1,addr="0x20000000",len="4"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('addr="0x20000000"'),
    );
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.not.stringContaining("type="));
  });

  it("handles =memory-changed with type=code", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=memory-changed,thread-group=i1,addr="0x08000000",len="16",type="code"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining('type="code"'));
  });

  it("handles =record-started with method and format", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      '=record-started,thread-group="i1",method="btrace",format="bts"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('method="btrace"'),
    );
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining('format="bts"'));
  });

  it("handles =record-stopped", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord('=record-stopped,thread-group="i1"');

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining('thread-group="i1"'),
    );
  });

  it("handles =traceframe-changed with num and tracepoint", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord("=traceframe-changed,num=0,tracepoint=1");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("num=0"));
  });

  it("handles =traceframe-changed end", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord("=traceframe-changed,end");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("end"));
  });

  it("handles =tsv-created", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord("=tsv-created,name=$trace_timestamp,initial=0");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining("name=$trace_timestamp"),
    );
  });

  it("handles =tsv-deleted with name", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord("=tsv-deleted,name=$trace_timestamp");

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      expect.stringContaining("name=$trace_timestamp"),
    );
  });

  it("handles =tsv-modified with optional current", async () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);

    const ok = await handler.parseNotifyAsyncRecord(
      "=tsv-modified,name=$trace_timestamp,initial=0,current=42",
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("current=42"));
  });
});
