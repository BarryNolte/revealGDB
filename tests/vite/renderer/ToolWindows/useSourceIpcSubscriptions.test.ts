// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { gdbBreakpoint, gdbShowSourceInfo } from "../../../../src/common/gdb-state-types";
import { useSourceIpcSubscriptions } from "../../../../src/renderer/ToolWindows/useSourceIpcSubscriptions";

type UnsubFn = ReturnType<typeof vi.fn>;

let sourceFileCallback: ((data: gdbShowSourceInfo) => void) | null = null;
let breakpointsCallback: ((data: Map<string, gdbBreakpoint>) => void) | null = null;
let unsubSourceFile: UnsubFn;
let unsubBreakpoints: UnsubFn;

beforeEach(() => {
  sourceFileCallback = null;
  breakpointsCallback = null;
  unsubSourceFile = vi.fn();
  unsubBreakpoints = vi.fn();

  (window as unknown as Record<string, unknown>).ipcToMain = {
    debuggerData: {
      sourceFile: vi.fn((cb: (data: gdbShowSourceInfo) => void): UnsubFn => {
        sourceFileCallback = cb;
        return unsubSourceFile;
      }),
      breakpoints: vi.fn((cb: (data: Map<string, gdbBreakpoint>) => void): UnsubFn => {
        breakpointsCallback = cb;
        return unsubBreakpoints;
      }),
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSourceIpcSubscriptions", () => {
  it("subscribes to sourceFile and breakpoints on mount", async () => {
    const handlers = {
      onSourceFile: vi.fn(),
      onBreakpoints: vi.fn(),
    };
    renderHook(() => useSourceIpcSubscriptions(handlers));
    await act(async () => {});

    const ipc = (window as unknown as { ipcToMain: { debuggerData: { sourceFile: ReturnType<typeof vi.fn>; breakpoints: ReturnType<typeof vi.fn> } } }).ipcToMain;
    expect(ipc.debuggerData.sourceFile).toHaveBeenCalledTimes(1);
    expect(ipc.debuggerData.breakpoints).toHaveBeenCalledTimes(1);
  });

  it("calls onSourceFile handler when sourceFile IPC fires", async () => {
    const onSourceFile = vi.fn();
    const handlers = { onSourceFile, onBreakpoints: vi.fn() };

    renderHook(() => useSourceIpcSubscriptions(handlers));
    await act(async () => {});

    const data: gdbShowSourceInfo = { fileName: "main.c", line: "42", contents: "int main() {}" };
    act(() => { sourceFileCallback!(data); });

    expect(onSourceFile).toHaveBeenCalledWith(data);
  });

  it("calls onBreakpoints handler when breakpoints IPC fires", async () => {
    const onBreakpoints = vi.fn();
    const handlers = { onSourceFile: vi.fn(), onBreakpoints };

    renderHook(() => useSourceIpcSubscriptions(handlers));
    await act(async () => {});

    const bkpt: gdbBreakpoint = {
      number: "1", type: "breakpoint", disp: "keep", enabled: "y",
      addr: "0x0040123", func: "main", file: "main.c", fullname: "/src/main.c",
      line: "5", tg: "i1", times: "0", installed: "", orgloc: "main.c:5",
    };
    const data = new Map([["1", bkpt]]);
    act(() => { breakpointsCallback!(data); });

    expect(onBreakpoints).toHaveBeenCalledWith(data);
  });

  it("unsubscribes both IPC channels on unmount", async () => {
    const handlers = {
      onSourceFile: vi.fn(),
      onBreakpoints: vi.fn(),
    };
    const { unmount } = renderHook(() => useSourceIpcSubscriptions(handlers));
    await act(async () => {});

    unmount();

    expect(unsubSourceFile).toHaveBeenCalledTimes(1);
    expect(unsubBreakpoints).toHaveBeenCalledTimes(1);
  });

  it("re-subscribes when onSourceFile handler reference changes", async () => {
    const ipcWindow = window as unknown as { ipcToMain: { debuggerData: { sourceFile: ReturnType<typeof vi.fn>; breakpoints: ReturnType<typeof vi.fn> } } };
    let handler1 = vi.fn();
    const stableBreakpoints = vi.fn();

    const { rerender } = renderHook(
      ({ sf }) => useSourceIpcSubscriptions({ onSourceFile: sf, onBreakpoints: stableBreakpoints }),
      { initialProps: { sf: handler1 } },
    );
    await act(async () => {});
    expect(ipcWindow.ipcToMain.debuggerData.sourceFile).toHaveBeenCalledTimes(1);
    expect(unsubSourceFile).not.toHaveBeenCalled();

    const handler2 = vi.fn();
    rerender({ sf: handler2 });
    await act(async () => {});

    // old subscription was torn down and a new one set up
    expect(unsubSourceFile).toHaveBeenCalledTimes(1);
    expect(ipcWindow.ipcToMain.debuggerData.sourceFile).toHaveBeenCalledTimes(2);
  });

  it("re-subscribes when onBreakpoints handler reference changes", async () => {
    const ipcWindow = window as unknown as { ipcToMain: { debuggerData: { sourceFile: ReturnType<typeof vi.fn>; breakpoints: ReturnType<typeof vi.fn> } } };
    const stableSourceFile = vi.fn();

    const { rerender } = renderHook(
      ({ bp }) => useSourceIpcSubscriptions({ onSourceFile: stableSourceFile, onBreakpoints: bp }),
      { initialProps: { bp: vi.fn() as (data: Map<string, gdbBreakpoint>) => void } },
    );
    await act(async () => {});
    expect(ipcWindow.ipcToMain.debuggerData.breakpoints).toHaveBeenCalledTimes(1);
    expect(unsubBreakpoints).not.toHaveBeenCalled();

    rerender({ bp: vi.fn() });
    await act(async () => {});

    expect(unsubBreakpoints).toHaveBeenCalledTimes(1);
    expect(ipcWindow.ipcToMain.debuggerData.breakpoints).toHaveBeenCalledTimes(2);
  });
});
