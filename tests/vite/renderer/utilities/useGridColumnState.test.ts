// @vitest-environment jsdom
import { Column } from "@syncfusion/ej2-grids";
import { GridComponent } from "@syncfusion/ej2-react-grids";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GridColumnState } from "../../../../src/common/grid-column-types";
import {
  applySavedColumnsToGrid,
  resetAllGridColumnDefaults,
  useGridColumnState,
} from "../../../../src/renderer/utilities/useGridColumnState";

function makeCol(field: string, width?: string | number, visible = true): Column {
  return { field, width, visible } as unknown as Column;
}

function makeGrid(cols: Column[]) {
  return {
    columns: cols,
    refreshColumns: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function makeSaved(
  field: string,
  width: string | number,
  visible: boolean,
  index: number,
): GridColumnState {
  return { field, width, visible, index };
}

beforeEach(() => {
  const notifyMain = vi.fn();
  const getSettings = vi.fn(() => Promise.resolve({}));
  (window as unknown as Record<string, unknown>).ipcToMain = {
    // Flat legacy aliases — kept for test assertion compatibility
    getSettings,
    notifyMain,
    // Structured API — used by updated production code
    queries: { app: { getSettings } },
    commands: { app: { notifyMain } },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("applySavedColumnsToGrid", () => {
  it("returns early when columns is empty", () => {
    const grid = makeGrid([]);
    applySavedColumnsToGrid(grid as unknown as GridComponent, [makeSaved("a", 100, true, 0)]);
    expect(grid.refreshColumns).not.toHaveBeenCalled();
  });

  it("returns early when columns is null/undefined", () => {
    const grid = {
      columns: null,
      refreshColumns: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    applySavedColumnsToGrid(grid as unknown as GridComponent, [makeSaved("a", 100, true, 0)]);
    expect(grid.refreshColumns).not.toHaveBeenCalled();
  });

  it("applies saved width and visibility to a matched column", () => {
    const col = makeCol("name", 100, true);
    const grid = makeGrid([col]);
    applySavedColumnsToGrid(grid as unknown as GridComponent, [makeSaved("name", 200, false, 0)]);
    expect(col.width).toBe(200);
    expect(col.visible).toBe(false);
    expect(grid.refreshColumns).toHaveBeenCalled();
  });

  it("does not modify a column with no saved state match", () => {
    const col = makeCol("name", 100, true);
    const grid = makeGrid([col]);
    applySavedColumnsToGrid(grid as unknown as GridComponent, [makeSaved("other", 200, false, 0)]);
    expect(col.width).toBe(100);
    expect(grid.refreshColumns).toHaveBeenCalled();
  });

  it("sorts columns according to saved index order", () => {
    const colB = makeCol("b");
    const colA = makeCol("a");
    const grid = makeGrid([colB, colA]);
    applySavedColumnsToGrid(grid as unknown as GridComponent, [
      makeSaved("a", 100, true, 0),
      makeSaved("b", 100, true, 1),
    ]);
    // After sort, "a" (index 0) should be first
    const sorted = grid.columns as unknown as Column[];
    expect(sorted[0]).toBe(colA);
    expect(sorted[1]).toBe(colB);
  });

  it("places unsaved columns at end when some columns have no saved state", () => {
    const colA = makeCol("a");
    const colUnsaved = makeCol("z");
    const grid = makeGrid([colUnsaved, colA]);
    applySavedColumnsToGrid(grid as unknown as GridComponent, [makeSaved("a", 100, true, 0)]);
    const sorted = grid.columns as unknown as Column[];
    // "a" has saved index 0, "z" has no saved state → goes to end
    expect(sorted[0]).toBe(colA);
    expect(sorted[1]).toBe(colUnsaved);
  });
});

describe("resetAllGridColumnDefaults", () => {
  it("calls notifyMain with reset-grid-columns and undefined data", () => {
    resetAllGridColumnDefaults();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith({
      command: "reset-grid-columns",
      data: undefined,
    });
  });
});

describe("useGridColumnState hook", () => {
  it("starts with loaded=false and savedColumns=undefined", async () => {
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    expect(result.current.loaded).toBe(false);
    expect(result.current.savedColumns).toBeUndefined();
    await act(async () => {}); // drain pending async state updates
  });

  it("sets loaded=true when getSettings resolves with no saved columns", async () => {
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    expect(result.current.loaded).toBe(true);
    expect(result.current.savedColumns).toBeUndefined();
  });

  it("loads and stores saved columns from settings", async () => {
    const saved = [makeSaved("field", 100, true, 0)];
    (window.ipcToMain.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      gui: { gridColumns: { locals: saved } },
    });
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    expect(result.current.savedColumns).toEqual(saved);
    expect(result.current.loaded).toBe(true);
  });

  it("sets loaded=true even when getSettings rejects", async () => {
    (window.ipcToMain.getSettings as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("failed"),
    );
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    expect(result.current.loaded).toBe(true);
  });

  it("attaches event listeners to grid when gridRef has a current value", async () => {
    const mockGrid = makeGrid([makeCol("f", 80, true)]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    const events = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(events).toContain("resizeStop");
    expect(events).toContain("actionComplete");
    expect(events).toContain("columnMenuClick");
  });

  it("does not attach listeners when gridRef.current is null", async () => {
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    // loaded is still true, no error thrown
    expect(result.current.loaded).toBe(true);
  });

  it("applies saved columns to grid when loaded and gridRef present", async () => {
    const saved = [makeSaved("f", 120, true, 0)];
    (window.ipcToMain.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      gui: { gridColumns: { locals: saved } },
    });
    const col = makeCol("f", 80, true);
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    expect(col.width).toBe(120);
  });

  it("calls notifyMain with save-grid-columns on resizeStop event", async () => {
    const col = makeCol("f", 80, true);
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const resizeHandler = calls.find((c) => c[0] === "resizeStop")?.[1];
    resizeHandler?.();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });

  it("calls notifyMain on actionComplete with requestType columnstate", async () => {
    const col = makeCol("f", 80, true);
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      (args: unknown) => void,
    ][];
    const actionHandler = calls.find((c) => c[0] === "actionComplete")?.[1];
    actionHandler?.({ requestType: "columnstate" });
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });

  it("does NOT call notifyMain on actionComplete with other requestType", async () => {
    const mockGrid = makeGrid([makeCol("f")]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      (args: unknown) => void,
    ][];
    const actionHandler = calls.find((c) => c[0] === "actionComplete")?.[1];
    (window.ipcToMain.notifyMain as ReturnType<typeof vi.fn>).mockClear();
    actionHandler?.({ requestType: "filter" });
    expect(window.ipcToMain.notifyMain).not.toHaveBeenCalled();
  });

  it("calls notifyMain on columnMenuClick with AutoFit item", async () => {
    const mockGrid = makeGrid([makeCol("f")]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      (args: unknown) => void,
    ][];
    const menuHandler = calls.find((c) => c[0] === "columnMenuClick")?.[1];
    menuHandler?.({ item: { id: "grid_AutoFit" } });
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });

  it("does NOT call notifyMain on columnMenuClick with non-AutoFit item", async () => {
    const mockGrid = makeGrid([makeCol("f")]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      (args: unknown) => void,
    ][];
    const menuHandler = calls.find((c) => c[0] === "columnMenuClick")?.[1];
    (window.ipcToMain.notifyMain as ReturnType<typeof vi.fn>).mockClear();
    menuHandler?.({ item: { id: "grid_SortAscending" } });
    expect(window.ipcToMain.notifyMain).not.toHaveBeenCalled();
  });

  it("handles columnMenuClick with missing item gracefully", async () => {
    const mockGrid = makeGrid([makeCol("f")]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});

    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      (args: unknown) => void,
    ][];
    const menuHandler = calls.find((c) => c[0] === "columnMenuClick")?.[1];
    (window.ipcToMain.notifyMain as ReturnType<typeof vi.fn>).mockClear();
    menuHandler?.({});
    expect(window.ipcToMain.notifyMain).not.toHaveBeenCalled();
  });

  it("resetColumnDefaults sets savedColumns to undefined and calls notifyMain", async () => {
    const saved = [makeSaved("f", 100, true, 0)];
    (window.ipcToMain.getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      gui: { gridColumns: { locals: saved } },
    });
    const gridRef = { current: null };
    const { result } = renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    expect(result.current.savedColumns).toEqual(saved);

    await act(async () => {
      result.current.resetColumnDefaults();
    });
    expect(result.current.savedColumns).toBeUndefined();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "reset-grid-columns" }),
    );
  });

  it("triggers normalizeWidth with number width via resizeStop", async () => {
    const col = makeCol("f", 80, true); // number width
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const resizeHandler = calls.find((c) => c[0] === "resizeStop")?.[1];
    resizeHandler?.();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });

  it("triggers normalizeWidth with undefined width via resizeStop", async () => {
    const col = makeCol("f", undefined, true); // undefined width → "auto"
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const resizeHandler = calls.find((c) => c[0] === "resizeStop")?.[1];
    resizeHandler?.();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });

  it("triggers normalizeWidth with percentage string via resizeStop", async () => {
    const col = makeCol("f", "50%", true);
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const resizeHandler = calls.find((c) => c[0] === "resizeStop")?.[1];
    resizeHandler?.();
    const notifyCall = (window.ipcToMain.notifyMain as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[0] as Record<string, unknown>).command === "save-grid-columns",
    );
    const colState = (notifyCall?.[0] as Record<string, unknown>)?.data;
    expect(colState).toBeTruthy();
  });

  it("triggers normalizeWidth with px string via resizeStop", async () => {
    const col = makeCol("f", "120px", true);
    const mockGrid = makeGrid([col]);
    const gridRef = { current: mockGrid };
    renderHook(() => useGridColumnState("locals", gridRef as never));
    await act(async () => {});
    const calls = (mockGrid.addEventListener as ReturnType<typeof vi.fn>).mock.calls as [
      string,
      () => void,
    ][];
    const resizeHandler = calls.find((c) => c[0] === "resizeStop")?.[1];
    resizeHandler?.();
    expect(window.ipcToMain.notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ command: "save-grid-columns" }),
    );
  });
});
