import { describe, expect, it } from "vitest";
import {
  GdbConnector,
  OutputAvailableEventArgs,
} from "../../../../../src/main/mi-interface/gdb-connector/gdb-connector";

describe("gdb-connector base class", () => {
  it("assigns incrementing line numbers to output events", () => {
    const first = new OutputAvailableEventArgs("one");
    const second = new OutputAvailableEventArgs("two");

    expect(second.LineNum).toBe(first.LineNum + 1);
    expect(first.Output).toBe("one");
    expect(second.Output).toBe("two");
  });

  it("defaults to a no-op connector implementation", () => {
    const connector = new GdbConnector();
    const listener = vi.fn();

    connector.on("output", listener);
    connector.emit("output", new OutputAvailableEventArgs("line"));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(connector.Start({ name: "profile", shell: "bash", commands: ["gdb"] })).toBe(false);
    expect(connector.End()).toBe(false);
    expect(connector.IsRunning()).toBe(false);
    expect(() => connector.Send("help")).not.toThrow();
  });
});
