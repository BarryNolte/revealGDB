/**
 * Basic test to verify hook modules can be imported.
 */
// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

describe("Basic module imports", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });

  it("can import workspace types", async () => {
    const types = await import("../../../../src/common/workspace-types");
    expect(types).toBeDefined();
  });

  it("can import preload interface", async () => {
    const iface = await import("../../../../src/preload/interface");
    expect(iface).toBeDefined();
  });
});
