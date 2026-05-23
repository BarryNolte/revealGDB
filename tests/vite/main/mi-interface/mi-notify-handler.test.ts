/**
 * mi-notify-handler.test module.
 *
 * @remarks
 * Source module for mi-notify-handler.test.
 */

/**
 * @file mi-notify-handler.test.ts
 * @description Source module for mi-notify-handler.test.
 */

import { describe, expect, it, vi } from "vitest";
import { gdbStateDatabase } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiNotifyAsyncHandler } from "../../../../src/main/mi-interface/mi-notify-handler";
import { MiOutputHost } from "../../../../src/main/mi-interface/mi-output-types";

const { mockWebContentsSend } = vi.hoisted(() => ({
  mockWebContentsSend: vi.fn(),
}));

vi.mock("../../../../src/main/ipc-sender", () => ({
  sendToRenderer: mockWebContentsSend,
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
    expect(host.emit).toHaveBeenCalledWith("log-stream", "=traceframe-changed end");
  });

  // ── Thread group commands ────────────────────────────────────────────────

  it("handles =thread-group-started", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-group-started,id="i1",pid="1234"');
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", expect.anything());
  });

  it("handles =thread-group-exited", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-group-exited,id="i1"');
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", expect.anything());
  });

  it("handles =thread-group-removed", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-group-removed,id="i1"');
    expect(ok).toBe(true);
  });

  it("handles =thread-group-added with no id match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    // No id= in data — regex fails to extract an id
    const ok = handler.parseNotifyAsyncRecord("=thread-group-added,noid");
    expect(ok).toBe(true); // still returns true (threadUpdateUI called)
  });

  it("handles =thread-group-started with no id match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=thread-group-started,noid");
    expect(ok).toBe(true);
  });

  it("handles =thread-group-exited with no id match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=thread-group-exited,noid");
    expect(ok).toBe(true);
  });

  it("returns false for unknown thread-group-* subcommand", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-group-unknown,id="i1"');
    expect(ok).toBe(false);
  });

  // ── Thread commands ──────────────────────────────────────────────────────

  it("handles =thread-created", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-created,id="1",group-id="i1"');
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", expect.anything());
  });

  it("handles =thread-created with no regex match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    // Missing group-id — regex will fail
    const ok = handler.parseNotifyAsyncRecord('=thread-created,id="1"');
    expect(ok).toBe(true); // still returns true
  });

  it("handles =thread-exited", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=thread-exited,id="1",group-id="i1"');
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-threads", expect.anything());
  });

  it("handles =thread-exited with no id match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=thread-exited,noid");
    expect(ok).toBe(true);
  });

  it("returns false for unknown thread-* subcommand", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=thread-unknown,data=1");
    expect(ok).toBe(false);
  });

  // ── Breakpoint commands ──────────────────────────────────────────────────

  const bkptData =
    "=breakpoint-created," +
    'bkpt={number="1",type="breakpoint",disp="keep",enabled="y",' +
    'addr="0x00400456",func="main",file="test.c",' +
    'fullname="/path/to/test.c",line="3",thread-groups=["i1"],' +
    'times="0",original-location="test.c:3"}';

  const bkptModData =
    "=breakpoint-modified," +
    'bkpt={number="1",type="breakpoint",disp="keep",enabled="y",' +
    'addr="0x00400456",func="main",file="test.c",' +
    'fullname="/path/to/test.c",line="3",thread-groups=["i1"],' +
    'times="1",original-location="test.c:3"}';

  it("handles =breakpoint-created", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord(bkptData);
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-brkpts", expect.any(Map));
  });

  it("handles =breakpoint-created with no regex match → returns false", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=breakpoint-created,bad data");
    expect(ok).toBe(false);
  });

  it("handles =breakpoint-modified", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord(bkptModData);
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-brkpts", expect.any(Map));
  });

  it("handles =breakpoint-modified with no regex match → returns false", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=breakpoint-modified,bad data");
    expect(ok).toBe(false);
  });

  it("handles =breakpoint-deleted", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=breakpoint-deleted,id="1"');
    expect(ok).toBe(true);
    expect(mockWebContentsSend).toHaveBeenCalledWith("data-brkpts", expect.any(Map));
  });

  it("handles =breakpoint-deleted with no id match", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=breakpoint-deleted,noid");
    expect(ok).toBe(true);
  });

  it("returns false for unknown breakpoint-* subcommand", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=breakpoint-unknown,data=1");
    expect(ok).toBe(false);
  });

  // ── TSV commands ─────────────────────────────────────────────────────────

  it("handles =tsv-created", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=tsv-created,name=mytsv,initial=0");
    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("name=mytsv"));
  });

  it("handles =tsv-deleted with name", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=tsv-deleted,name=mytsv");
    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("name=mytsv"));
  });

  it("handles =tsv-deleted without name", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=tsv-deleted,noname");
    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", "=tsv-deleted");
  });

  it("handles =tsv-modified with current", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=tsv-modified,name=mytsv,initial=0,current=42");
    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.stringContaining("current=42"));
  });

  it("handles =tsv-modified without current", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord("=tsv-modified,name=mytsv,initial=0");
    expect(ok).toBe(true);
    // no current= in output
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.not.stringContaining("current="));
  });

  // ── record-started without format ────────────────────────────────────────

  it("handles =record-started without format field", () => {
    const host = createHost();
    const handler = new MiNotifyAsyncHandler(host);
    const ok = handler.parseNotifyAsyncRecord('=record-started,thread-group="i1",method="btrace"');
    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith("log-stream", expect.not.stringContaining("format="));
  });
});
