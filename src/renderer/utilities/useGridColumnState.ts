/**
 * React hook for persisting and restoring SyncFusion grid column state
 * (width, visibility, order) across sessions via the settings file.
 *
 * Uses imperative addEventListener on the grid instance (not JSX props)
 * to reliably capture resizeStop and actionComplete events.
 */

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { GridColumnState, GridColumnsSettings, GridName } from "../../common/grid-column-types";
import { Column } from "@syncfusion/ej2-grids";
import { GridComponent } from "@syncfusion/ej2-react-grids";
import { TreeGridComponent } from "@syncfusion/ej2-react-treegrid";
import { GdbAny } from "../../common/gdb-common";

export type UseGridColumnStateResult = {
  /** Saved column states, or undefined if not yet loaded or no saved state. */
  savedColumns: GridColumnState[] | undefined;
  /** Whether the saved state has been loaded (even if no saved state exists). */
  loaded: boolean;
  /** Clear saved state for this grid, reverting to defaults on next render. */
  resetColumnDefaults: () => void;
};

/**
 * Normalize a SyncFusion column width for consistent storage.
 * - Strips trailing "px" suffix (SyncFusion adds it after resize via formatUnit)
 * - Preserves percentage strings like "20%"
 * - Returns a number when possible, otherwise the original string
 */
function normalizeWidth(width: string | number | undefined): number | string {
  if (width === undefined || width === null) return "auto";
  if (typeof width === "number") return width;

  const trimmed = width.trim();
  // Keep percentage and other CSS-unit widths as strings
  if (trimmed.endsWith("%") || trimmed === "auto") return trimmed;
  // Strip "px" and convert to number
  const stripped = trimmed.replace(/px$/i, "");
  const num = parseFloat(stripped);
  return isNaN(num) ? trimmed : num;
}

/**
 * Extracts persistable state from SyncFusion column objects.
 * Uses array position as the column index (grid.columns is always in display order).
 */
function extractColumnState(columns: Column[]): GridColumnState[] {
  return columns
    .filter((col) => col.field)
    .map((col, idx) => ({
      field: col.field!,
      width: normalizeWidth(col.width),
      visible: col.visible !== false,
      index: idx,
    }));
}

/**
 * Apply saved column state (width, visibility, order) to a mounted grid.
 * Gracefully handles schema changes — ignores saved columns that no longer
 * exist and uses defaults for new columns not found in saved state.
 */
export function applySavedColumnsToGrid(
  grid: GridComponent | TreeGridComponent,
  savedColumns: GridColumnState[],
): void {
  const columns = grid.columns as Column[];
  if (!columns || columns.length === 0) return;

  const savedMap = new Map(savedColumns.map((s) => [s.field, s]));

  // Apply widths and visibility
  for (const col of columns) {
    const saved = savedMap.get(col.field!);
    if (saved) {
      col.width = saved.width;
      col.visible = saved.visible;
    }
  }

  // Sort columns according to saved order. Columns without saved state
  // are appended at the end in their original relative order.
  const maxSavedIndex = Math.max(...savedColumns.map((s) => s.index), -1);
  const sorted = [...columns].sort((a, b) => {
    const savedA = savedMap.get(a.field!);
    const savedB = savedMap.get(b.field!);
    const indexA = savedA ? savedA.index : maxSavedIndex + 1 + columns.indexOf(a);
    const indexB = savedB ? savedB.index : maxSavedIndex + 1 + columns.indexOf(b);
    return indexA - indexB;
  });

  grid.columns = sorted;
  grid.refreshColumns();
}

/**
 * Save column state to settings via IPC.
 */
function saveColumnsToSettings(gridName: GridName, columns: Column[]): void {
  const state = extractColumnState(columns);
  window.ipcToMain.notifyMain({
    command: "save-grid-columns",
    data: { gridName, columns: state },
  });
}

/**
 * Hook to save/restore SyncFusion grid column widths, visibility, and order.
 *
 * Attaches event listeners imperatively (via grid.addEventListener) instead of
 * React props to ensure reliable event capture regardless of SyncFusion's
 * internal React mixin lifecycle.
 *
 * @param gridName - Unique identifier for this grid in settings
 * @param gridRef - Ref to the GridComponent or TreeGridComponent
 * @returns Object with saved column state and reset function
 */
export function useGridColumnState(
  gridName: GridName,
  gridRef: RefObject<GridComponent | TreeGridComponent | null>,
): UseGridColumnStateResult {
  const [savedColumns, setSavedColumns] = useState<GridColumnState[] | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const gridNameRef = useRef(gridName);

  // Load saved column state from settings on mount
  useEffect(() => {
    gridNameRef.current = gridName;

    window.ipcToMain
      .getSettings()
      .then((settings: Record<string, unknown>) => {
        const gui = settings?.gui as Record<string, unknown> | undefined;
        const gridColumns = gui?.gridColumns as GridColumnsSettings | undefined;
        const columns = gridColumns?.[gridName];

        if (columns && Array.isArray(columns) && columns.length > 0) {
          setSavedColumns(columns);
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, [gridName]);

  // Apply saved column state once grid is mounted and settings are loaded
  useEffect(() => {
    if (loaded && savedColumns && gridRef.current) {
      applySavedColumnsToGrid(gridRef.current, savedColumns);
    }
  }, [loaded, savedColumns, gridRef]);

  // Attach imperative event listeners for reliable save
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const handleResizeStop = () => {
      saveColumnsToSettings(gridNameRef.current, grid.columns as Column[]);
    };

    const handleActionComplete = (args: GdbAny) => {
      if (args.requestType === "columnstate" || args.requestType === "reorder") {
        saveColumnsToSettings(gridNameRef.current, grid.columns as Column[]);
      }
    };

    const handleColumnMenuClick = (args: GdbAny) => {
      const itemId: string = args?.item?.id ?? "";
      if (itemId.includes("AutoFit")) {
        saveColumnsToSettings(gridNameRef.current, grid.columns as Column[]);
      }
    };

    grid.addEventListener("resizeStop", handleResizeStop);
    grid.addEventListener("actionComplete", handleActionComplete);
    grid.addEventListener("columnMenuClick", handleColumnMenuClick);

    return () => {
      grid.removeEventListener("resizeStop", handleResizeStop);
      grid.removeEventListener("actionComplete", handleActionComplete);
      grid.removeEventListener("columnMenuClick", handleColumnMenuClick);
    };
  }, [gridRef]);

  const resetColumnDefaults = useCallback(() => {
    setSavedColumns(undefined);
    window.ipcToMain.notifyMain({
      command: "reset-grid-columns",
      data: gridNameRef.current,
    });
  }, []);

  return { savedColumns, loaded, resetColumnDefaults };
}

/**
 * Reset all grid column settings to defaults.
 * Clears the entire gridColumns section from settings.
 */
export function resetAllGridColumnDefaults(): void {
  window.ipcToMain.notifyMain({
    command: "reset-grid-columns",
    data: undefined,
  });
}
