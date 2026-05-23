/**
 * @file useGdbSourceWindowController.test.ts
 * @description Unit tests for exported tooltip helpers:
 *   getMemberExpression, getDisplayTypeName, buildTooltipHtml, makeTooltipDataProvider.
 */

// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { Ace } from "ace-builds";
import ace from "ace-builds";
import { type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TooltipContext } from "../../../../src/renderer/ToolWindows/useGdbSourceWindowController";
import {
    buildTooltipHtml,
    getDisplayTypeName,
    getMemberExpression,
    makeTooltipDataProvider,
    useContextMenuDispatcher,
    useGdbSourceWindowController,
    useSourceTooltip,
    wireTooltipCloseHandlers,
} from "../../../../src/renderer/ToolWindows/useGdbSourceWindowController";

// ---------------------------------------------------------------------------
// Module mocks required for the hook
// ---------------------------------------------------------------------------

const {
  mockOnLoad,
  mockOnMenuSelect,
  mockOnGutterMenuSelect,
  mockSetBreakpoints,
  mockUpdateBreakpointMarkers,
  mockRightClickedRowRef,
  mockGutterMenuRef,
  mockEditorMenuRef,
  mockUseSourceIpcSubscriptions,
  mockActivatePanel,
} = vi.hoisted(() => ({
  mockOnLoad: vi.fn(),
  mockOnMenuSelect: vi.fn(),
  mockOnGutterMenuSelect: vi.fn(),
  mockSetBreakpoints: vi.fn(),
  mockUpdateBreakpointMarkers: vi.fn(),
  mockRightClickedRowRef: { current: -1 },
  mockGutterMenuRef: { current: null },
  mockEditorMenuRef: { current: null },
  mockUseSourceIpcSubscriptions: vi.fn(),
  mockActivatePanel: vi.fn(),
}));

vi.mock("ace-builds", () => ({
  default: {
    require: vi.fn().mockReturnValue({
      HoverTooltip: class {
        setDataProvider = vi.fn();
        addToEditor = vi.fn();
        removeFromEditor = vi.fn();
      },
    }),
    config: { set: vi.fn() },
  },
}));

vi.mock("ace-builds/src-noconflict/ext-searchbox", () => ({}));

vi.mock("react-ace", () => ({
  default: vi.fn().mockReturnValue(null),
}));

vi.mock("@syncfusion/ej2-popups", () => ({
  Tooltip: vi.fn().mockImplementation(function () {
    return {
      destroy: vi.fn(),
      close: vi.fn(),
      open: vi.fn(),
      content: "",
      beforeOpen: null,
    };
  }),
}));

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: vi.fn().mockReturnValue(null),
}));

vi.mock("../../../../src/renderer/ToolWindows/useSourceBreakpointInteractions", () => ({
  useSourceBreakpointInteractions: vi.fn().mockReturnValue({
    setBreakpoints: mockSetBreakpoints,
    updateBreakpointMarkers: mockUpdateBreakpointMarkers,
    onLoad: mockOnLoad,
    onMenuSelect: mockOnMenuSelect,
    onGutterMenuSelect: mockOnGutterMenuSelect,
    rightClickedRowRef: mockRightClickedRowRef,
    gutterMenuRef: mockGutterMenuRef,
    editorMenuRef: mockEditorMenuRef,
  }),
}));

vi.mock("../../../../src/renderer/ToolWindows/useSourceEditorSettings", () => ({
  useSourceEditorSettings: vi.fn().mockReturnValue({
    theme: "vs-dark",
    fontSize: 14,
    lineHeight: 20,
    fontName: "monospace",
  }),
}));

vi.mock("../../../../src/renderer/ToolWindows/useSourceIpcSubscriptions", () => ({
  useSourceIpcSubscriptions: (args: unknown) => mockUseSourceIpcSubscriptions(args),
}));

vi.mock("../../../../src/renderer/ToolWindows/GdbSourceEditorConfig", () => ({
  configureAceBasePath: vi.fn(),
  defaultMode: "ace/mode/text",
  editorModes: new Map(),
}));

vi.mock("../../../../src/renderer/utilities/dock-menu-state", () => ({
  dockMenuConnector: { activatePanel: mockActivatePanel },
}));

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

  it("returns null when col is past the end of the line (short-circuit guard)", () => {
    // col >= line.length → early return; exercises the || short-circuit branch
    expect(getMemberExpression("abc", 3)).toBeNull(); // col == length
    expect(getMemberExpression("abc", 10)).toBeNull(); // col >> length
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

// ---------------------------------------------------------------------------
// useGdbSourceWindowController — hook tests
// ---------------------------------------------------------------------------

describe("useGdbSourceWindowController", () => {
  let mockStackFramesUnsub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStackFramesUnsub = vi.fn();
    (window as unknown as Record<string, unknown>).ipcToMain = {
      debuggerData: {
        stackFrames: vi.fn().mockReturnValue(mockStackFramesUnsub),
      },
      queries: {
        debugger: {
          queryVarAtPosition: vi.fn().mockResolvedValue(undefined),
          getVarByName: vi.fn().mockResolvedValue(undefined),
          evaluateExpression: vi.fn().mockResolvedValue(undefined),
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns expected shape from hook", () => {
    const { result } = renderHook(() => useGdbSourceWindowController());
    const ctrl = result.current;
    expect(ctrl).toHaveProperty("sourceState");
    expect(ctrl).toHaveProperty("mode");
    expect(ctrl).toHaveProperty("theme");
    expect(ctrl).toHaveProperty("fontSize");
    expect(ctrl).toHaveProperty("lineHeight");
    expect(ctrl).toHaveProperty("fontName");
    expect(ctrl).toHaveProperty("editorRef");
    expect(ctrl).toHaveProperty("onLoad");
    expect(ctrl).toHaveProperty("onMenuSelect");
    expect(ctrl).toHaveProperty("onGutterMenuSelect");
    expect(ctrl).toHaveProperty("gutterMenuRef");
    expect(ctrl).toHaveProperty("editorMenuRef");
    expect(ctrl).toHaveProperty("onOpenDisassembly");
  });

  it("onOpenDisassembly dispatches DISASM_FUNCTION event", () => {
    const { result } = renderHook(() => useGdbSourceWindowController());

    const listener = vi.fn();
    window.addEventListener("disasm-function", listener);

    act(() => {
      result.current.onOpenDisassembly();
    });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("disasm-function", listener);
  });

  it("handleSourceFile updates sourceState when called via onSourceFile", () => {
    let capturedOnSourceFile: ((data: unknown) => void) | null = null;
    mockUseSourceIpcSubscriptions.mockImplementation(
      (args: { onSourceFile: (data: unknown) => void }) => {
        capturedOnSourceFile = args.onSourceFile;
      },
    );

    const { result } = renderHook(() => useGdbSourceWindowController());

    const data = { fileName: "/src/main.c", filePath: "/src/main.c", lineNumber: 10, content: "" };
    act(() => {
      capturedOnSourceFile!(data);
    });

    expect(mockUpdateBreakpointMarkers).toHaveBeenCalled();
    expect(result.current.sourceState).toBeDefined();
  });

  it("handleBreakpoints calls setBreakpoints and updateBreakpointMarkers", () => {
    let capturedOnBreakpoints: ((data: unknown) => void) | null = null;
    mockUseSourceIpcSubscriptions.mockImplementation(
      (args: { onBreakpoints: (data: unknown) => void }) => {
        capturedOnBreakpoints = args.onBreakpoints;
      },
    );

    renderHook(() => useGdbSourceWindowController());

    const bpMap = new Map();
    act(() => {
      capturedOnBreakpoints!(bpMap);
    });

    expect(mockSetBreakpoints).toHaveBeenCalledWith(bpMap);
    expect(mockUpdateBreakpointMarkers).toHaveBeenCalled();
  });

  it("subscribes to stack frames on mount and unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useGdbSourceWindowController());
    expect(
      (
        window as unknown as {
          ipcToMain: { debuggerData: { stackFrames: ReturnType<typeof vi.fn> } };
        }
      ).ipcToMain.debuggerData.stackFrames,
    ).toHaveBeenCalled();
    unmount();
    expect(mockStackFramesUnsub).toHaveBeenCalled();
  });

  it("stack frame callback updates topStackFuncRef (func field)", async () => {
    let capturedFrameCallback: ((frames: unknown[]) => void) | null = null;
    (
      window as unknown as {
        ipcToMain: { debuggerData: { stackFrames: ReturnType<typeof vi.fn> }; queries: unknown };
      }
    ).ipcToMain.debuggerData.stackFrames = vi.fn((cb: (frames: unknown[]) => void) => {
      capturedFrameCallback = cb;
      return mockStackFramesUnsub;
    });

    const { result } = renderHook(() => useGdbSourceWindowController());
    expect(capturedFrameCallback).not.toBeNull();

    act(() => {
      capturedFrameCallback!([{ level: "0", func: "main", addr: "0x1000" }]);
    });

    // trigger onOpenDisassembly to verify topStackFuncRef was captured correctly
    const listener = vi.fn();
    window.addEventListener("disasm-function", listener);
    act(() => {
      result.current.onOpenDisassembly();
    });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: "main" }));
    window.removeEventListener("disasm-function", listener);
  });

  it("stack frame callback does not update when no level-0 frame exists", async () => {
    let capturedFrameCallback: ((frames: unknown[]) => void) | null = null;
    (
      window as unknown as {
        ipcToMain: { debuggerData: { stackFrames: ReturnType<typeof vi.fn> }; queries: unknown };
      }
    ).ipcToMain.debuggerData.stackFrames = vi.fn((cb: (frames: unknown[]) => void) => {
      capturedFrameCallback = cb;
      return mockStackFramesUnsub;
    });

    const { result } = renderHook(() => useGdbSourceWindowController());
    expect(capturedFrameCallback).not.toBeNull();

    // Only non-top frames — topFrame is undefined → if(topFrame) false branch
    act(() => {
      capturedFrameCallback!([{ level: "1", func: "helper", addr: "0x2000" }]);
    });

    // topStackFuncRef.current stays "" (never updated)
    const listener = vi.fn();
    window.addEventListener("disasm-function", listener);
    act(() => {
      result.current.onOpenDisassembly();
    });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: "" }));
    window.removeEventListener("disasm-function", listener);
  });

  it("stack frame callback uses addr when topFrame.func is empty", async () => {
    let capturedFrameCallback: ((frames: unknown[]) => void) | null = null;
    (
      window as unknown as {
        ipcToMain: { debuggerData: { stackFrames: ReturnType<typeof vi.fn> }; queries: unknown };
      }
    ).ipcToMain.debuggerData.stackFrames = vi.fn((cb: (frames: unknown[]) => void) => {
      capturedFrameCallback = cb;
      return mockStackFramesUnsub;
    });

    const { result } = renderHook(() => useGdbSourceWindowController());

    // func="" → topFrame.func || topFrame.addr uses addr (false branch of ||)
    act(() => {
      capturedFrameCallback!([{ level: "0", func: "", addr: "0x8000" }]);
    });

    const listener = vi.fn();
    window.addEventListener("disasm-function", listener);
    act(() => {
      result.current.onOpenDisassembly();
    });
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: "0x8000" }));
    window.removeEventListener("disasm-function", listener);
  });

  it("displayData does not update fullFilePathRef when fileName is empty", () => {
    let capturedOnSourceFile: ((data: unknown) => void) | null = null;
    mockUseSourceIpcSubscriptions.mockImplementation(
      (args: { onSourceFile: (data: unknown) => void }) => {
        capturedOnSourceFile = args.onSourceFile;
      },
    );

    renderHook(() => useGdbSourceWindowController());

    // fileName="" → if(data.fileName) false branch — fullFilePathRef not updated
    act(() => {
      capturedOnSourceFile!({ fileName: "", line: "5", contents: undefined });
    });

    expect(mockUpdateBreakpointMarkers).toHaveBeenCalled();
  });

  it("sourceState.currentMarker effect fires setTimeout when marker becomes non-negative", async () => {
    vi.useFakeTimers();
    let capturedOnSourceFile: ((data: unknown) => void) | null = null;
    mockUseSourceIpcSubscriptions.mockImplementation(
      (args: { onSourceFile: (data: unknown) => void }) => {
        capturedOnSourceFile = args.onSourceFile;
      },
    );

    const { result } = renderHook(() => useGdbSourceWindowController());

    // Provide contents → applySourceUpdate sets hasSource=true, currentMarker = parseInt("10")-1 = 9
    act(() => {
      capturedOnSourceFile!({
        fileName: "/src/main.c",
        line: "10",
        contents: "int main() { return 0; }",
      });
    });

    // currentMarker should be 9 (line 10, 0-based)
    expect(result.current.sourceState.currentMarker).toBe(9);

    // Advance timers so the setTimeout(150) fires (editorRef.current is null in tests,
    // so scrollToLine is not called, but the if(currentMarker !== -1) TRUE branch IS covered)
    act(() => {
      vi.runAllTimers();
    });

    vi.useRealTimers();
  });

  it("onOpenDisassembly calls dockMenuConnector.activatePanel", () => {
    const { result } = renderHook(() => useGdbSourceWindowController());
    act(() => {
      result.current.onOpenDisassembly();
    });
    expect(mockActivatePanel).toHaveBeenCalled();
  });

  it("scrollToLine is called on editorRef.current when currentMarker changes and editor is set", () => {
    vi.useFakeTimers();
    let capturedOnSourceFile: ((data: unknown) => void) | null = null;
    mockUseSourceIpcSubscriptions.mockImplementation(
      (args: { onSourceFile: (data: unknown) => void }) => {
        capturedOnSourceFile = args.onSourceFile;
      },
    );

    const { result } = renderHook(() => useGdbSourceWindowController());

    const mockScrollToLine = vi.fn();
    result.current.editorRef.current = {
      editor: { scrollToLine: mockScrollToLine },
    } as unknown as import("react-ace").default;

    act(() => {
      capturedOnSourceFile!({ fileName: "/src/test.c", line: "5", contents: "int x = 0;" });
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(mockScrollToLine).toHaveBeenCalledWith(4, true, true);
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// wireTooltipCloseHandlers
// ---------------------------------------------------------------------------

describe("wireTooltipCloseHandlers", () => {
  let sfTip: {
    close: ReturnType<typeof vi.fn>;
    beforeOpen: ((args: { element: HTMLElement | null }) => void) | null;
  };
  let container: HTMLDivElement;
  let session: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
  let cleanupFn: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    sfTip = { close: vi.fn(), beforeOpen: null };
    container = document.createElement("div");
    document.body.appendChild(container);
    session = { on: vi.fn(), off: vi.fn() };
    cleanupFn = wireTooltipCloseHandlers(
      sfTip as unknown as import("@syncfusion/ej2-popups").Tooltip,
      container,
      session as unknown as Ace.EditSession,
    );
  });

  afterEach(() => {
    cleanupFn();
    container.remove();
    vi.useRealTimers();
  });

  it("subscribes to changeScrollTop on the session", () => {
    expect(session.on).toHaveBeenCalledWith("changeScrollTop", expect.any(Function));
  });

  it("changeScrollTop listener closes the tooltip immediately", () => {
    const scrollCb = session.on.mock.calls.find(
      ([ev]: [string]) => ev === "changeScrollTop",
    )?.[1] as (() => void) | undefined;
    scrollCb?.();
    expect(sfTip.close).toHaveBeenCalledTimes(1);
  });

  it("container mouseleave schedules sfTip.close after 80 ms", () => {
    container.dispatchEvent(new MouseEvent("mouseleave"));
    expect(sfTip.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
  });

  it("scheduled close is suppressed when mouse is inside popup rect", () => {
    const popup = document.createElement("div");
    Object.defineProperty(popup, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 200, top: 100, bottom: 200 }),
    });
    sfTip.beforeOpen!({ element: popup });
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 150, clientY: 150 }));
    container.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).not.toHaveBeenCalled();
  });

  it("scheduled close fires when mouse is outside popup rect", () => {
    const popup = document.createElement("div");
    Object.defineProperty(popup, "getBoundingClientRect", {
      value: () => ({ left: 100, right: 200, top: 100, bottom: 200 }),
    });
    sfTip.beforeOpen!({ element: popup });
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 50 }));
    container.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
  });

  it("popup mouseleave also triggers scheduled close", () => {
    const popup = document.createElement("div");
    document.body.appendChild(popup);
    // Move mouse away from origin so the zero-rect popup is not treated as containing it
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));
    sfTip.beforeOpen!({ element: popup });
    popup.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
    popup.remove();
  });

  it("beforeOpen deregisters previous popup mouseleave listener on new open", () => {
    const popup1 = document.createElement("div");
    const popup2 = document.createElement("div");
    document.body.appendChild(popup1);
    document.body.appendChild(popup2);
    sfTip.beforeOpen!({ element: popup1 });
    sfTip.beforeOpen!({ element: popup2 });
    popup1.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).not.toHaveBeenCalled();
    popup1.remove();
    popup2.remove();
  });

  it("beforeOpen is a no-op when same element is passed again", () => {
    const popup = document.createElement("div");
    document.body.appendChild(popup);
    // Move mouse away from origin so the zero-rect popup is not treated as containing it
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));
    sfTip.beforeOpen!({ element: popup });
    sfTip.beforeOpen!({ element: popup });
    popup.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
    popup.remove();
  });

  it("cleanup removes mouseleave listener from container", () => {
    cleanupFn();
    container.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).not.toHaveBeenCalled();
  });

  it("cleanup calls session.off for changeScrollTop", () => {
    cleanupFn();
    expect(session.off).toHaveBeenCalledWith("changeScrollTop", expect.any(Function));
  });

  it("cleanup cancels any pending scheduled close", () => {
    container.dispatchEvent(new MouseEvent("mouseleave"));
    cleanupFn();
    vi.advanceTimersByTime(80);
    expect(sfTip.close).not.toHaveBeenCalled();
  });

  it("scheduled close with no popup element still calls sfTip.close", () => {
    // tipPopupEl is null — the if(tipPopupEl) branch is false, so goes straight to sfTip.close()
    container.dispatchEvent(new MouseEvent("mouseleave"));
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
  });

  it("second scheduledClose clears the pending timer before setting a new one", () => {
    // First mouseleave — closeTimer is null, so if(closeTimer) is false; sets the timer.
    container.dispatchEvent(new MouseEvent("mouseleave"));
    // Second mouseleave BEFORE the 80ms fires — closeTimer is now set, so if(closeTimer)
    // is TRUE; clearTimeout is called (covers that branch), then a fresh timer is set.
    container.dispatchEvent(new MouseEvent("mouseleave"));
    // Advance past 80ms — only the second timer fires, so sfTip.close is called exactly once.
    vi.advanceTimersByTime(80);
    expect(sfTip.close).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// useContextMenuDispatcher
// ---------------------------------------------------------------------------

describe("useContextMenuDispatcher", () => {
  it("returns early when editorRef.current is null", () => {
    const nullRef = { current: null } as RefObject<import("react-ace").default | null>;
    renderHook(() =>
      useContextMenuDispatcher(
        nullRef,
        { current: -1 },
        { current: null } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
        { current: null } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
      ),
    );
    // No error thrown; no setShowPrintMargin calls
  });

  it("calls setShowPrintMargin(false) when editor is present", () => {
    const mockSetShowPrintMargin = vi.fn();
    const editorContainer = document.createElement("div");
    document.body.appendChild(editorContainer);
    const editorRef = {
      current: {
        editor: {
          setShowPrintMargin: mockSetShowPrintMargin,
          container: editorContainer,
          renderer: { gutterWidth: 40, screenToTextCoordinates: vi.fn().mockReturnValue({ row: 5 }) },
        },
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    renderHook(() =>
      useContextMenuDispatcher(
        editorRef,
        { current: -1 },
        { current: null } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
        { current: null } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
      ),
    );

    expect(mockSetShowPrintMargin).toHaveBeenCalledWith(false);
    editorContainer.remove();
  });

  it("contextmenu in editor area opens editor menu", () => {
    const mockEditorOpen = vi.fn();
    const mockGutterOpen = vi.fn();
    const editorContainer = document.createElement("div");
    Object.defineProperty(editorContainer, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 500, bottom: 500 }),
      configurable: true,
    });
    document.body.appendChild(editorContainer);

    const rightClickedRowRef = { current: -1 };
    const editorRef = {
      current: {
        editor: {
          setShowPrintMargin: vi.fn(),
          container: editorContainer,
          renderer: {
            gutterWidth: 40,
            screenToTextCoordinates: vi.fn().mockReturnValue({ row: 3 }),
          },
        },
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    renderHook(() =>
      useContextMenuDispatcher(
        editorRef,
        rightClickedRowRef,
        { current: { open: mockGutterOpen } } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
        { current: { open: mockEditorOpen } } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
      ),
    );

    // clientX=100 > gutterWidth=40 → editor area
    act(() => {
      editorContainer.dispatchEvent(
        new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: false }),
      );
    });

    expect(mockEditorOpen).toHaveBeenCalledWith(200, 100);
    expect(mockGutterOpen).not.toHaveBeenCalled();
    expect(rightClickedRowRef.current).toBe(3);
    editorContainer.remove();
  });

  it("contextmenu in gutter area opens gutter menu", () => {
    const mockEditorOpen = vi.fn();
    const mockGutterOpen = vi.fn();
    const editorContainer = document.createElement("div");
    Object.defineProperty(editorContainer, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 500, bottom: 500 }),
      configurable: true,
    });
    document.body.appendChild(editorContainer);

    const editorRef = {
      current: {
        editor: {
          setShowPrintMargin: vi.fn(),
          container: editorContainer,
          renderer: {
            gutterWidth: 40,
            screenToTextCoordinates: vi.fn().mockReturnValue({ row: 7 }),
          },
        },
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    renderHook(() =>
      useContextMenuDispatcher(
        editorRef,
        { current: -1 },
        { current: { open: mockGutterOpen } } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
        { current: { open: mockEditorOpen } } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
      ),
    );

    // clientX=30 < gutterWidth=40 → gutter area
    act(() => {
      editorContainer.dispatchEvent(
        new MouseEvent("contextmenu", { clientX: 30, clientY: 200, bubbles: false }),
      );
    });

    expect(mockGutterOpen).toHaveBeenCalledWith(200, 30);
    expect(mockEditorOpen).not.toHaveBeenCalled();
    editorContainer.remove();
  });

  it("cleanup removes contextmenu listener on unmount", () => {
    const mockEditorOpen = vi.fn();
    const editorContainer = document.createElement("div");
    Object.defineProperty(editorContainer, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 500, bottom: 500 }),
      configurable: true,
    });
    document.body.appendChild(editorContainer);

    const editorRef = {
      current: {
        editor: {
          setShowPrintMargin: vi.fn(),
          container: editorContainer,
          renderer: { gutterWidth: 40, screenToTextCoordinates: vi.fn().mockReturnValue({ row: 3 }) },
        },
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    const { unmount } = renderHook(() =>
      useContextMenuDispatcher(
        editorRef,
        { current: -1 },
        { current: null } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
        { current: { open: mockEditorOpen } } as RefObject<import("@syncfusion/ej2-react-navigations").ContextMenuComponent | null>,
      ),
    );

    unmount();

    act(() => {
      editorContainer.dispatchEvent(
        new MouseEvent("contextmenu", { clientX: 100, clientY: 200, bubbles: false }),
      );
    });

    expect(mockEditorOpen).not.toHaveBeenCalled();
    editorContainer.remove();
  });
});

// ---------------------------------------------------------------------------
// useSourceTooltip
// ---------------------------------------------------------------------------

describe("useSourceTooltip", () => {
  let mockRefEditor: HTMLDivElement;
  let mockSession: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRefEditor = document.createElement("div");
    document.body.appendChild(mockRefEditor);
    mockSession = { on: vi.fn(), off: vi.fn() };
    vi.mocked(ace.require).mockClear();
  });

  afterEach(() => {
    mockRefEditor.remove();
  });

  it("returns early when editorRef.current is null", () => {
    const nullRef = { current: null } as RefObject<import("react-ace").default | null>;
    const { unmount } = renderHook(() => useSourceTooltip(nullRef, { current: "" }));
    unmount();
    expect(vi.mocked(ace.require)).not.toHaveBeenCalled();
  });

  it("creates HoverTooltip when editor is present", () => {
    const editorRef = {
      current: {
        editor: { session: mockSession },
        refEditor: mockRefEditor,
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    const { unmount } = renderHook(() => useSourceTooltip(editorRef, { current: "" }));

    expect(vi.mocked(ace.require)).toHaveBeenCalledWith("ace/tooltip");
    unmount();
  });

  it("wires tooltip close handlers via session changeScrollTop subscription", () => {
    const editorRef = {
      current: {
        editor: { session: mockSession },
        refEditor: mockRefEditor,
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    const { unmount } = renderHook(() => useSourceTooltip(editorRef, { current: "" }));

    expect(mockSession.on).toHaveBeenCalledWith("changeScrollTop", expect.any(Function));
    unmount();
  });

  it("cleanup calls removeFromEditor and session.off on unmount", () => {
    let capturedInst: {
      removeFromEditor: ReturnType<typeof vi.fn>;
      addToEditor: ReturnType<typeof vi.fn>;
      setDataProvider: ReturnType<typeof vi.fn>;
    } | null = null;

    vi.mocked(ace.require).mockReturnValueOnce({
      HoverTooltip: class {
        setDataProvider = vi.fn();
        addToEditor = vi.fn();
        removeFromEditor = vi.fn();
        constructor() {
          capturedInst = this as typeof capturedInst;
        }
      },
    });

    const editorRef = {
      current: {
        editor: { session: mockSession },
        refEditor: mockRefEditor,
      },
    } as unknown as RefObject<import("react-ace").default | null>;

    const { unmount } = renderHook(() => useSourceTooltip(editorRef, { current: "" }));
    unmount();

    expect(capturedInst?.removeFromEditor).toHaveBeenCalled();
    expect(mockSession.off).toHaveBeenCalledWith("changeScrollTop", expect.any(Function));
  });
});
