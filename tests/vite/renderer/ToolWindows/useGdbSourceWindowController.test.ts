/**
 * @file useGdbSourceWindowController.test.ts
 * @description Unit tests for exported tooltip helpers:
 *   getMemberExpression, getDisplayTypeName, buildTooltipHtml, makeTooltipDataProvider.
 */

// @vitest-environment jsdom
import type { Ace } from "ace-builds";
import { type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TooltipContext } from "../../../../src/renderer/ToolWindows/useGdbSourceWindowController";
import {
  buildTooltipHtml,
  getDisplayTypeName,
  getMemberExpression,
  makeTooltipDataProvider,
} from "../../../../src/renderer/ToolWindows/useGdbSourceWindowController";

// ---------------------------------------------------------------------------
// getMemberExpression
// ---------------------------------------------------------------------------

describe("getMemberExpression", () => {
  it("returns null when cursor is off an identifier", () => {
    // "int x = 0;" — col 3 is space, col 6 is '='
    expect(getMemberExpression("int x = 0;", 3)).toBeNull(); // space
    expect(getMemberExpression("int x = 0;", 6)).toBeNull(); // '='
    expect(getMemberExpression("int x = 0;", 9)).toBeNull(); // ';'
  });

  it("returns base only for a plain identifier", () => {
    const result = getMemberExpression("  foo  ", 2);
    expect(result).not.toBeNull();
    expect(result!.base).toBe("foo");
    expect(result!.fieldPath).toBe("");
    expect(result!.rawExpr).toBe("foo");
  });

  it("returns fieldPath for dot-access when cursor is on the field", () => {
    // "mbs.ms.a" — cursor on 'a' (col 7)
    const line = "  mbs.ms.a  ";
    const result = getMemberExpression(line, 9); // 'a'
    expect(result).not.toBeNull();
    expect(result!.base).toBe("mbs");
    expect(result!.fieldPath).toBe("ms.a");
    expect(result!.rawExpr).toBe("mbs.ms.a");
  });

  it("returns fieldPath for arrow-access when cursor is on the field", () => {
    const line = "ptr->field";
    const result = getMemberExpression(line, 5); // 'f' of 'field'
    expect(result).not.toBeNull();
    expect(result!.base).toBe("ptr");
    expect(result!.fieldPath).toBe("field");
    expect(result!.rawExpr).toBe("ptr->field");
  });

  it("returns empty fieldPath when cursor is on the base of a member chain", () => {
    const line = "mbs.ms.a";
    const result = getMemberExpression(line, 1); // cursor on 'm' of 'mbs'
    expect(result).not.toBeNull();
    expect(result!.base).toBe("mbs");
    expect(result!.fieldPath).toBe("");
  });

  it("handles mixed -> and . chains", () => {
    const line = "obj->sub.val";
    const result = getMemberExpression(line, 9); // 'v' of 'val'
    expect(result).not.toBeNull();
    expect(result!.rawExpr).toBe("obj->sub.val");
    expect(result!.fieldPath).toBe("sub.val");
  });

  it("skips earlier matches and returns the one containing the cursor column", () => {
    // "abc xyz" — cursor at col 4 ('x'). First match "abc" [0,3] is before col=4 so it is skipped.
    const result = getMemberExpression("abc xyz", 4);
    expect(result).not.toBeNull();
    expect(result!.base).toBe("xyz");
    expect(result!.fieldPath).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getDisplayTypeName
// ---------------------------------------------------------------------------

describe("getDisplayTypeName", () => {
  it("strips the variable name from the end of the type string", () => {
    expect(getDisplayTypeName("unsigned long flash_size", "flash_size")).toBe("unsigned long");
  });

  it("collapses struct type to 'struct'", () => {
    expect(getDisplayTypeName("struct MyData x", "x")).toBe("struct");
  });

  it("collapses union type to 'struct'", () => {
    expect(getDisplayTypeName("union Variant u", "u")).toBe("struct");
  });

  it("returns empty string when nothing is left after stripping", () => {
    expect(getDisplayTypeName("x", "x")).toBe("");
  });

  it("normalises extra whitespace in scalar type", () => {
    expect(getDisplayTypeName("unsigned  long   n", "n")).toBe("unsigned long");
  });
});

// ---------------------------------------------------------------------------
// buildTooltipHtml
// ---------------------------------------------------------------------------

describe("buildTooltipHtml", () => {
  it("renders name + value + type when all provided", () => {
    const html = buildTooltipHtml("myVar", "42", "unsigned int");
    expect(html).toContain('class="tip-name"');
    expect(html).toContain("myVar");
    expect(html).toContain('class="tip-eq"');
    expect(html).toContain(" = ");
    expect(html).toContain('class="tip-value"');
    expect(html).toContain("42");
    expect(html).toContain('class="tip-type"');
    expect(html).toContain("unsigned int");
  });

  it("renders name only when value is undefined", () => {
    const html = buildTooltipHtml("myVar", undefined, "");
    expect(html).toContain('class="tip-name"');
    expect(html).not.toContain('class="tip-eq"');
    expect(html).not.toContain('class="tip-value"');
    expect(html).not.toContain('class="tip-type"');
  });

  it("omits type line when typeName is empty", () => {
    const html = buildTooltipHtml("myVar", "42", "");
    expect(html).toContain("42");
    expect(html).not.toContain('class="tip-type"');
  });

  it("renders type as a block div", () => {
    const html = buildTooltipHtml("x", "1", "int");
    expect(html).toContain('<div class="tip-type">int</div>');
  });

  it("renders complex value as tip-struct tree, not tip-value span", () => {
    const html = buildTooltipHtml("s", "{x = 1, y = 2}", "struct");
    expect(html).toContain('class="tip-struct"');
    expect(html).not.toContain('class="tip-value"');
    expect(html).toContain("x");
    expect(html).toContain("1");
  });
});

// ---------------------------------------------------------------------------
// makeTooltipDataProvider
// ---------------------------------------------------------------------------

describe("makeTooltipDataProvider", () => {
  type QueryDebugger = Window["ipcToMain"]["queries"]["debugger"];

  let sfTip: { open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; content: string };
  let anchor: HTMLDivElement;
  let fullFilePathRef: RefObject<string>;
  let mockQueryVarAtPosition: ReturnType<typeof vi.fn>;
  let mockGetVarByName: ReturnType<typeof vi.fn>;
  let mockEvaluateExpression: ReturnType<typeof vi.fn>;

  /** Build a minimal fake ace editor whose renderer/session return fixed values. */
  function makeEditor(line: string, row = 0, col = 0): Ace.Editor {
    return {
      renderer: {
        screenToTextCoordinates: vi.fn().mockReturnValue({ row, column: col }),
      },
      session: {
        getLine: vi.fn().mockReturnValue(line),
      },
    } as unknown as Ace.Editor;
  }

  /** Build a fake ace MouseEvent at a given client position. */
  function makeMouseEvent(clientX = 100, clientY = 200): Ace.MouseEvent {
    return { clientX, clientY } as unknown as Ace.MouseEvent;
  }

  beforeEach(() => {
    anchor = document.createElement("div");
    sfTip = { open: vi.fn(), close: vi.fn(), content: "" };
    fullFilePathRef = { current: "/src/main.c" };

    mockQueryVarAtPosition = vi.fn();
    mockGetVarByName = vi.fn();
    mockEvaluateExpression = vi.fn();

    const ipc = {
      queries: {
        debugger: {
          queryVarAtPosition: mockQueryVarAtPosition,
          getVarByName: mockGetVarByName,
          evaluateExpression: mockEvaluateExpression,
        } as unknown as QueryDebugger,
      },
    };
    Object.defineProperty(window, "ipcToMain", { value: ipc, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("closes tooltip when sourceFile is empty", async () => {
    fullFilePathRef = { current: "" };
    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  int x = 0;", 0, 6));
    expect(sfTip.close).toHaveBeenCalledOnce();
    expect(sfTip.open).not.toHaveBeenCalled();
  });

  it("calls queryVarAtPosition + evaluateExpression for plain identifier", async () => {
    mockQueryVarAtPosition.mockResolvedValue({ name: "x", typeStr: "int x" });
    mockEvaluateExpression.mockResolvedValue("5");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  x  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());

    expect(mockQueryVarAtPosition).toHaveBeenCalledWith("/src/main.c", 1, 2);
    expect(mockEvaluateExpression).toHaveBeenCalledWith("x");
    expect(sfTip.content).toContain("x");
    expect(sfTip.content).toContain("5");
    expect(sfTip.content).toContain("int");
  });

  it("calls getVarByName + evaluateExpression for member expression", async () => {
    mockGetVarByName.mockResolvedValue({ name: "mbs", typeStr: "struct MyStruct mbs" });
    mockEvaluateExpression.mockResolvedValue("42");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    // line = "mbs.field", cursor on 'f' (col 4)
    provider(makeMouseEvent(), makeEditor("mbs.field", 0, 4));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());

    expect(mockGetVarByName).toHaveBeenCalledWith("/src/main.c", "mbs");
    expect(mockEvaluateExpression).toHaveBeenCalledWith("mbs.field");
    expect(sfTip.content).toContain("mbs.field");
    expect(sfTip.content).toContain("42");
  });

  it("closes tooltip when both IPC results are undefined", async () => {
    mockQueryVarAtPosition.mockResolvedValue(undefined);
    mockEvaluateExpression.mockResolvedValue(undefined);

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  x  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.close).toHaveBeenCalled());
    expect(sfTip.open).not.toHaveBeenCalled();
  });

  it("positions the anchor at the mouse coordinates before opening", async () => {
    mockQueryVarAtPosition.mockResolvedValue({ name: "n", typeStr: "int n" });
    mockEvaluateExpression.mockResolvedValue("7");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(300, 400), makeEditor("  n  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(anchor.style.left).toBe("300px");
    expect(anchor.style.top).toBe("400px");
  });

  it("shows identifier from varInfo.name when available", async () => {
    mockQueryVarAtPosition.mockResolvedValue({ name: "realName", typeStr: "uint32_t realName" });
    mockEvaluateExpression.mockResolvedValue("0xDEAD");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  someIdent  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(sfTip.content).toContain("realName");
    expect(sfTip.content).not.toContain("someIdent");
  });

  it("closes tooltip when both IPC results are undefined for member expression path", async () => {
    mockGetVarByName.mockResolvedValue(undefined);
    mockEvaluateExpression.mockResolvedValue(undefined);

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    // "mbs.field" cursor on 'f' (col 4) → member expression path
    provider(makeMouseEvent(), makeEditor("mbs.field", 0, 4));

    await vi.waitFor(() => expect(sfTip.close).toHaveBeenCalled());
    expect(sfTip.open).not.toHaveBeenCalled();
  });

  it("shows empty typeName for member expression when varInfo.typeStr is falsy", async () => {
    mockGetVarByName.mockResolvedValue({ name: "mbs", typeStr: "" });
    mockEvaluateExpression.mockResolvedValue("42");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("mbs.field", 0, 4));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(sfTip.content).not.toContain('class="tip-type"');
  });

  it("uses ident when varInfo is undefined (value is defined) for plain identifier", async () => {
    mockQueryVarAtPosition.mockResolvedValue(undefined);
    mockEvaluateExpression.mockResolvedValue("99");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  myVar  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(sfTip.content).toContain("myVar");
  });

  it("shows empty typeName for plain identifier when varInfo has no typeStr", async () => {
    mockQueryVarAtPosition.mockResolvedValue({ name: "n", typeStr: "" });
    mockEvaluateExpression.mockResolvedValue("7");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    provider(makeMouseEvent(), makeEditor("  n  ", 0, 2));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(sfTip.content).not.toContain('class="tip-type"');
  });

  it("falls back to wordMatch when cursor is on non-word char with a word following", async () => {
    mockQueryVarAtPosition.mockResolvedValue(undefined);
    mockEvaluateExpression.mockResolvedValue("5");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    // cursor at col 0 ';' — getMemberExpression returns null; wordMatch finds "x"
    provider(makeMouseEvent(), makeEditor(";x", 0, 0));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(mockEvaluateExpression).toHaveBeenCalledWith("x");
  });

  it("falls back to empty ident when cursor is on non-word with no word following", async () => {
    mockQueryVarAtPosition.mockResolvedValue(undefined);
    mockEvaluateExpression.mockResolvedValue("0");

    const ctx: TooltipContext = {
      anchor,
      sfTip: sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      fullFilePathRef,
    };
    const provider = makeTooltipDataProvider(ctx);
    // cursor at col 0 ';' — getMemberExpression returns null; no word match in ";;"
    provider(makeMouseEvent(), makeEditor(";;", 0, 0));

    await vi.waitFor(() => expect(sfTip.open).toHaveBeenCalled());
    expect(mockEvaluateExpression).toHaveBeenCalledWith("");
  });
});
