/**
 * mi-status-handler.test module.
 *
 * @remarks
 * Source module for mi-status-handler.test.
 */

/**
 * @file mi-status-handler.test.ts
 * @description Source module for mi-status-handler.test.
 */

import { describe, expect, it, vi } from "vitest";
import { MiStatusAsyncHandler } from "../../../../src/main/mi-interface/mi-status-handler";
import { MiOutputHost } from "../../../../src/main/mi-interface/mi-output-types";
import { gdbStateDatabase } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";

describe("MiStatusAsyncHandler", () => {
  const createHost = (): MiOutputHost => ({
    gdbDB: new gdbStateDatabase(),
    emit: vi.fn(),
    send: vi.fn(),
  });

  it("handles +download section-start record (no progress fields)", () => {
    const host = createHost();
    const handler = new MiStatusAsyncHandler(host);

    const ok = handler.parseStatusAsyncRecord(
      '+download,section=".text",section-size="4096",total-size="16384"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      '+download section=".text" section-size="4096" total-size="16384"',
    );
  });

  it("handles +download progress record (with section-sent and total-sent)", () => {
    const host = createHost();
    const handler = new MiStatusAsyncHandler(host);

    const ok = handler.parseStatusAsyncRecord(
      '+download,section=".text",section-size="4096",total-size="16384",section-sent="2048",total-sent="8192"',
    );

    expect(ok).toBe(true);
    expect(host.emit).toHaveBeenCalledWith(
      "log-stream",
      '+download section=".text" section-size="4096" total-size="16384" section-sent="2048" total-sent="8192"',
    );
  });

  it("logs and returns false for unknown status async record", () => {
    const host = createHost();
    const handler = new MiStatusAsyncHandler(host);

    const ok = handler.parseStatusAsyncRecord("+unknown-record,data=value");

    expect(ok).toBe(false);
    expect(host.emit).toHaveBeenCalledWith("log-stream", "+unknown-record data=value");
  });
});
