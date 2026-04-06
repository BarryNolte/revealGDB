/**
 * RegisterStore.test module.
 *
 * @remarks
 * Source module for RegisterStore.test.
 */

/**
 * @file RegisterStore.test.ts
 * @description Source module for RegisterStore.test.
 */

import { describe, expect, it } from "vitest";
import { RegisterStore } from "../../../../../../src/main/mi-interface/gdb-state-database/stores/RegisterStore";

describe("RegisterStore", () => {
  it("creates a register entry when a name is added first", () => {
    const store = new RegisterStore();

    store.addRegister("0", "r0");

    expect(store.get("0")).toEqual({ name: "r0", value: "", changed: false });
  });

  it("preserves the register name when a value is added later and tracks changes", () => {
    const store = new RegisterStore();
    store.addRegister("0", "r0");

    store.addRegisterValue("0", "0x1");
    expect(store.get("0")).toEqual({ name: "r0", value: "0x1", changed: true });

    store.addRegisterValue("0", "0x1");
    expect(store.get("0")).toEqual({ name: "r0", value: "0x1", changed: false });
  });

  it("uses the index as a fallback name when a value arrives first and clears entries", () => {
    const store = new RegisterStore();

    store.addRegisterValue("3", "0xff");
    expect(store.get("3")).toEqual({ name: "3", value: "0xff", changed: true });

    store.clear();
    expect(store.registers.size).toBe(0);
  });
});
