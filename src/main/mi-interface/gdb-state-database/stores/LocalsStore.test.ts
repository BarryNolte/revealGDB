import { describe, expect, it } from "vitest";
import { LocalsStore } from "./LocalsStore";

describe("LocalsStore", () => {
  it("parses and stores locals", () => {
    const store = new LocalsStore();

    store.parseAndStoreLocals('{name="counter",value="7"}');

    expect(store.locals?.locals).toHaveLength(1);
    expect(store.locals?.locals[0].name).toBe("counter");
    expect(store.locals?.locals[0].value).toBe("7");
    expect(store.getLocals()).toBe(store.locals);
  });

  it("clears stored locals", () => {
    const store = new LocalsStore();
    store.parseAndStoreLocals('{name="counter",value="7"}');

    store.clearLocals();

    expect(store.locals).toBeUndefined();
    expect(store.getLocals()).toBeUndefined();
  });
});
