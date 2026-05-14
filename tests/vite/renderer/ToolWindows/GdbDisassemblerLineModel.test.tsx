/**
 * GdbDisassemblerLineModel.test module.
 *
 * @remarks
 * Source module for GdbDisassemblerLineModel.test.
 */

/**
 * @file GdbDisassemblerLineModel.test.tsx
 * @description Source module for GdbDisassemblerLineModel.test.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisasmToken } from "../../../../src/main/mi-interface/gdb-state-database/gdbStateDatabase";
import {
  extractFunctionName,
  renderGroupCaption,
  renderInstructionParts,
  toInstructionParts,
} from "../../../../src/renderer/ToolWindows/GdbDisassemblerLineModel";

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

    expect(screen.getByText(/main :/)).toBeTruthy();
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

  describe("renderInstructionParts non-function token paths", () => {
    it("renders instruction token as plain span (no trailing NBSP)", () => {
      const { container } = render(
        renderInstructionParts([{ type: "instruction", value: "mov" }], vi.fn()),
      );
      const span = container.querySelector(".disasmInstruction");
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe("mov");
    });

    it("renders text token as plain span with trailing NBSP when no registerNames", () => {
      const { container } = render(
        renderInstructionParts([{ type: "text", value: "eax" }], vi.fn()),
      );
      const span = container.querySelector(".disasmText");
      expect(span).not.toBeNull();
      expect(span!.textContent).toBe("eax\u00A0");
    });

    it("renders text token as register span when name is in register set", () => {
      const onRegisterHover = vi.fn();
      const onRegisterLeave = vi.fn();
      const { container } = render(
        renderInstructionParts(
          [{ type: "text", value: "eax" }],
          vi.fn(),
          new Set(["eax"]),
          onRegisterHover,
          onRegisterLeave,
        ),
      );
      expect(container.querySelector(".disasmRegister")).not.toBeNull();
    });

    it("renders %eax (AT&T % prefix) as register span after stripping prefix", () => {
      const { container } = render(
        renderInstructionParts(
          [{ type: "text", value: "%eax" }],
          vi.fn(),
          new Set(["eax"]),
          vi.fn(),
        ),
      );
      expect(container.querySelector(".disasmRegister")).not.toBeNull();
    });

    it("renders text as plain span when name is NOT in register set", () => {
      const { container } = render(
        renderInstructionParts(
          [{ type: "text", value: "eax" }],
          vi.fn(),
          new Set(["rbx"]),
          vi.fn(),
        ),
      );
      expect(container.querySelector(".disasmRegister")).toBeNull();
      expect(container.querySelector(".disasmText")).not.toBeNull();
    });

    it("renders text as plain span when onRegisterHover is not provided", () => {
      const { container } = render(
        renderInstructionParts(
          [{ type: "text", value: "eax" }],
          vi.fn(),
          new Set(["eax"]),
          // onRegisterHover omitted → no register span
        ),
      );
      expect(container.querySelector(".disasmRegister")).toBeNull();
      expect(container.querySelector(".disasmText")).not.toBeNull();
    });
  });
});
