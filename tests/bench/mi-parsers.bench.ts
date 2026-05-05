// @vitest-environment node

import { bench, describe, vi } from "vitest";
import { gdbStateDatabase } from "../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import { MiExecAsyncHandler } from "../../src/main/mi-interface/mi-exec-handler";
import { MiNotifyAsyncHandler } from "../../src/main/mi-interface/mi-notify-handler";
import type { MiOutputHost } from "../../src/main/mi-interface/mi-output-types";
import { MiResultRecordHandler } from "../../src/main/mi-interface/mi-result-handler";

vi.mock("../../src/main/ipc-sender", () => ({
  sendToRenderer: vi.fn(),
}));

function makeHost(): MiOutputHost {
  return { gdbDB: new gdbStateDatabase(), emit: vi.fn(), send: vi.fn() };
}

// ─── MiNotifyAsyncHandler ────────────────────────────────────────────────────

describe("MiNotifyAsyncHandler", () => {
  const host = makeHost();
  const handler = new MiNotifyAsyncHandler(host);

  bench("thread-group-added (simple)", async () => {
    await handler.parseNotifyAsyncRecord('=thread-group-added,id="i1"');
  });

  bench("library-loaded (with ranges array)", async () => {
    await handler.parseNotifyAsyncRecord(
      '=library-loaded,id="/lib/libc.so.6",target-name="/lib/libc.so.6",host-name="/lib/libc.so.6",symbols-loaded="0",thread-group="i1",ranges=[{from="0x1000",to="0x2000"}]',
    );
  });

  bench("memory-changed (with type field)", async () => {
    await handler.parseNotifyAsyncRecord(
      '=memory-changed,thread-group=i1,addr="0x08000000",len="16",type="code"',
    );
  });

  bench("record-started (with method and format)", async () => {
    await handler.parseNotifyAsyncRecord(
      '=record-started,thread-group="i1",method="btrace",format="bts"',
    );
  });
});

// ─── MiExecAsyncHandler ──────────────────────────────────────────────────────

describe("MiExecAsyncHandler", () => {
  const host = makeHost();
  host.gdbDB.addThreadGroup("i1");
  host.gdbDB.createThread("1", "i1");
  host.gdbDB.addThread({
    id: "1",
    name: "Thread 1",
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

  bench("running (all threads)", () => {
    handler.parseExecAsyncRecord('*running,thread-id="all"');
  });

  bench("stopped (breakpoint-hit)", () => {
    handler.parseExecAsyncRecord('*stopped,reason="breakpoint-hit",thread-id="1"');
  });

  bench("stopped (signal-received, multiple fields)", () => {
    handler.parseExecAsyncRecord(
      '*stopped,reason="signal-received",signal-name="SIGINT",signal-meaning="Interrupt",thread-id="1",stopped-threads="all",core="0"',
    );
  });

  bench("stopped (exited-signalled)", () => {
    handler.parseExecAsyncRecord(
      '*stopped,reason="exited-signalled",signal-name="SIGSEGV",signal-meaning="Segmentation fault",thread-id="1",stopped-threads="all"',
    );
  });
});

// ─── MiResultRecordHandler ───────────────────────────────────────────────────

describe("MiResultRecordHandler", () => {
  const host = makeHost();
  const handler = new MiResultRecordHandler(host);

  bench("^done with features list", async () => {
    await handler.parseResultRecord('^done,features=["foo","bar"]');
  });

  bench("^done with register names (16 registers)", async () => {
    await handler.parseResultRecord(
      '^done,register-names=["r0","r1","r2","r3","r4","r5","r6","r7","r8","r9","r10","r11","r12","sp","lr","pc"]',
    );
  });

  bench("^running", async () => {
    await handler.parseResultRecord("^running");
  });

  bench("^error with message", async () => {
    await handler.parseResultRecord('^error,msg="No registers."');
  });
});
