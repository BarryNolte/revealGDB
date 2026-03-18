import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisasmToken } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import {
  extractFunctionName,
  renderGroupCaption,
  renderInstructionParts,
  toInstructionParts,
} from "./GdbDisassemblerLineModel";

describe("GdbDisassemblerLineModel", () => {
  it("maps instruction tokens to render parts", () => {
    const tokens: DisasmToken[] = [
      { type: "instruction", value: "mov" },
      { type: "address", value: "0x1000" },
      { type: "function", value: "<main>" },
      { type: "leftparen", value: "(" },
      { type: "rightparen", value: ")" },
      { type: "text", value: "eax" },
    ];

    const parts = toInstructionParts(tokens);

    expect(parts).toEqual([
      { className: "disasmInstruction", value: "mov", hasTrailingNbsp: false },
      { className: "disasmOpAddress", value: "0x1000", hasTrailingNbsp: true },
      {
        className: "disasmFunction",
        value: "<main>",
        hasTrailingNbsp: true,
        functionAddress: "main",
      },
      { className: "disasmParen", value: "(", hasTrailingNbsp: true },
      { className: "disasmParen", value: ")", hasTrailingNbsp: true },
      { className: "disasmText", value: "eax", hasTrailingNbsp: true },
    ]);
  });

  it("extracts grouped function names from grid keys", () => {
    expect(extractFunctionName("func-foo::bar")).toBe("foo::bar");
    expect(extractFunctionName(undefined)).toBe("Unknown Function");
  });

  it("renders group caption with line count", () => {
    render(renderGroupCaption({ groupKey: "func-main", count: "7" }));

    expect(screen.getByText(/main:/)).toBeTruthy();
    expect(screen.getByText("(7 lines)")).toBeTruthy();
  });

  it("emits function click callbacks with normalized address", () => {
    const onFunctionClick = vi.fn();
    const tokens: DisasmToken[] = [{ type: "function", value: "<0x4012f0>" }];

    render(renderInstructionParts(tokens, onFunctionClick));
    fireEvent.click(screen.getByText("<0x4012f0>"));

    expect(onFunctionClick).toHaveBeenCalledTimes(1);
    expect(onFunctionClick).toHaveBeenCalledWith("0x4012f0");
  });
});
