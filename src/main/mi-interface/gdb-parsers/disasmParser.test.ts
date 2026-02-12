import { describe, expect, it } from "vitest";
import { parseDisasmTokens } from "./disasmParser";

describe("parseDisasmTokens", () => {
  it("parses addresses, functions, and parens", () => {
    const input = "0x40080aec <bootloader_random_enable+92> (0x3ffb2b74 <port_xSchedulerRunning>)";
    const tokens = parseDisasmTokens(input);

    expect(tokens).toEqual([
      { value: "0x40080aec", type: "address" },
      { value: "<bootloader_random_enable+92>", type: "function" },
      { value: "(", type: "leftparen" },
      { value: "0x3ffb2b74", type: "address" },
      { value: "<port_xSchedulerRunning>", type: "function" },
      { value: ")", type: "rightparen" },
    ]);
  });

  it("keeps other tokens as text", () => {
    const input = "mov a0, a1";
    const tokens = parseDisasmTokens(input);

    expect(tokens).toEqual([
      { value: "mov", type: "text" },
      { value: "a0,", type: "text" },
      { value: "a1", type: "text" },
    ]);
  });

  it("captures instruction tokens ending with a tab", () => {
    const input = "mov\t0x40080aec <bootloader_random_enable+92>";
    const tokens = parseDisasmTokens(input);

    expect(tokens).toEqual([
      { value: "mov\t", type: "instruction" },
      { value: "0x40080aec", type: "address" },
      { value: "<bootloader_random_enable+92>", type: "function" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(parseDisasmTokens("")).toEqual([]);
  });
});
