// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ace-builds", () => ({ default: {} }));
vi.mock("react-ace", () => ({ default: {} }));
vi.mock("@syncfusion/ej2-navigations", () => ({}));
vi.mock("@syncfusion/ej2-react-navigations", () => ({ ContextMenuComponent: class {} }));
vi.mock("../../../../src/renderer/utilities/Clipboard", () => ({
  sendTextToClipboard: vi.fn(),
}));
vi.mock("../../../../src/renderer/ToolWindows/GdbSourceWindowModel", () => ({
  mapBreakpointsToMarkers: vi.fn((data: Map<string, unknown>) => {
    const result: { file: string; line: number; type: string }[] = [];
    data.forEach((bp: unknown, key: string) => {
      const parts = key.split(":");
      result.push({ file: parts[0] || "", line: Number(parts[1]) || 0, type: "error" });
    });
    return result;
  }),
}));

import { sendTextToClipboard } from "../../../../src/renderer/utilities/Clipboard";
import { useSourceBreakpointInteractions } from "../../../../src/renderer/ToolWindows/useSourceBreakpointInteractions";

function makeFakeEditor(breakpoints: Record<number, string> = {}) {
  const session = {
    clearBreakpoints: vi.fn(),
    setBreakpoint: vi.fn(),
    getBreakpoints: vi.fn(() => breakpoints),
  };
  return {
    commands: {
      addCommand: vi.fn(),
    },
    setOption: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isFocused: vi.fn(() => true),
    getCursorPosition: vi.fn(() => ({ row: 5 })),
    getSelectedText: vi.fn(() => "selected text"),
    getSession: vi.fn(() => session),
    clearSelection: vi.fn(),
  };
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).ipcToMain = {
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
      app: { notifyMain: vi.fn() },
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSourceBreakpointInteractions", () => {
  it("returns expected interface when editorRef is null", async () => {
    const editorRef = { current: null };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    expect(typeof result.current.setBreakpoints).toBe("function");
    expect(typeof result.current.updateBreakpointMarkers).toBe("function");
    expect(typeof result.current.onLoad).toBe("function");
    expect(typeof result.current.onMenuSelect).toBe("function");
    expect(typeof result.current.onGutterMenuSelect).toBe("function");
  });

  it("useEditorSetup does nothing when editorRef.current is null", async () => {
    const editorRef = { current: null };
    const fullFilePathRef = { current: "/src/main.c" };
    renderHook(() => useSourceBreakpointInteractions(editorRef as never, fullFilePathRef));
    await act(async () => {});
    // No error = early return branch covered
  });

  it("useEditorSetup sets up commands when editor is available", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    renderHook(() => useSourceBreakpointInteractions(editorRef as never, fullFilePathRef));
    await act(async () => {});
    expect(fakeEditor.commands.addCommand).toHaveBeenCalled();
    expect(fakeEditor.setOption).toHaveBeenCalled();
    expect(fakeEditor.on).toHaveBeenCalledWith("gutterclick", expect.any(Function));
  });

  it("onLoad clears editor selection", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onLoad(fakeEditor as never);
    });
    expect(fakeEditor.clearSelection).toHaveBeenCalled();
  });

  it("onMenuSelect copy sends selected text to clipboard", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onMenuSelect({ item: { id: "copy" } } as never);
    });
    expect(sendTextToClipboard).toHaveBeenCalledWith("selected text");
  });

  it("onMenuSelect bp-set sends break command using cursor row when rightClickedRow < 0", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    // rightClickedRowRef.current starts at -1 → uses cursor position row 5
    act(() => {
      result.current.onMenuSelect({ item: { id: "bp-set" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      "break /src/main.c:6",
    );
  });

  it("onMenuSelect bp-set uses rightClickedRow when >= 0", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    // Set rightClickedRowRef to a non-negative value via the ref
    result.current.rightClickedRowRef.current = 10;
    act(() => {
      result.current.onMenuSelect({ item: { id: "bp-set" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      "break /src/main.c:11",
    );
  });

  it("onMenuSelect bp-run-to-cursor sends tbreak and continue", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onMenuSelect({ item: { id: "bp-run-to-cursor" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("tbreak"),
    );
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith("continue");
  });

  it("onMenuSelect bp-jump-and-stop sends tbreak and jump", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onMenuSelect({ item: { id: "bp-jump-and-stop" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("tbreak"),
    );
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("jump"),
    );
  });

  it("onMenuSelect bp-jump sends jump command", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onMenuSelect({ item: { id: "bp-jump" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("jump"),
    );
  });

  it("onMenuSelect unknown id does nothing", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onMenuSelect({ item: { id: "unknown" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("onGutterMenuSelect does nothing when editor is null", async () => {
    const editorRef = { current: null };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-set" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("onGutterMenuSelect bp-set sends break command", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-set" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("break"),
    );
  });

  it("onGutterMenuSelect bp-clear sends clear command", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-clear" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("clear"),
    );
  });

  it("onGutterMenuSelect bp-toggle toggles breakpoint via sendGdbCommand", async () => {
    // Row has no existing breakpoint → sets break
    const fakeEditor = makeFakeEditor({});
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    result.current.rightClickedRowRef.current = 2;
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-toggle" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      "break /src/main.c:3",
    );
  });

  it("onGutterMenuSelect bp-toggle clears breakpoint when one exists at row", async () => {
    // Row 2 has an existing breakpoint
    const fakeEditor = makeFakeEditor({ 2: "error" });
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    result.current.rightClickedRowRef.current = 2;
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-toggle" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      "clear /src/main.c:3",
    );
  });

  it("onGutterMenuSelect bp-run-to-cursor sends tbreak and continue", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-run-to-cursor" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith("continue");
  });

  it("onGutterMenuSelect bp-jump sends jump command", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});
    act(() => {
      result.current.onGutterMenuSelect({ item: { id: "bp-jump" } } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith(
      expect.stringContaining("jump"),
    );
  });

  it("updateBreakpointMarkers clears and sets markers for matching file", async () => {
    const fakeEditor = makeFakeEditor();
    const editorRef = { current: { editor: fakeEditor } };
    const fullFilePathRef = { current: "/src/main.c" };
    const { result } = renderHook(() =>
      useSourceBreakpointInteractions(editorRef as never, fullFilePathRef),
    );
    await act(async () => {});

    // Set breakpoints with matching file
    act(() => {
      result.current.setBreakpoints(
        new Map([
          ["/src/main.c:10", {} as never],
          ["/src/other.c:5", {} as never], // won't match
        ]),
      );
    });
    act(() => {
      result.current.updateBreakpointMarkers();
    });
    const session = fakeEditor.getSession();
    expect(session.clearBreakpoints).toHaveBeenCalled();
    expect(session.setBreakpoint).toHaveBeenCalled();
  });
});
