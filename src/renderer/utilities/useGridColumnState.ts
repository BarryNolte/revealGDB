/**
 * Provides use grid column state renderer utilities for formatting, state shaping, and shared view logic.
 *
 * @remarks
 * Exported symbols include `UseGridColumnStateResult`, `applySavedColumnsToGrid`, `useGridColumnState`, `resetAllGridColumnDefaults`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { Column, GridActionEventArgs } from "@syncfusion/ej2-grids";
import { MenuEventArgs } from "@syncfusion/ej2-navigations";
import { GridComponent } from "@syncfusion/ej2-react-grids";
import { TreeGridComponent } from "@syncfusion/ej2-react-treegrid";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { GridColumnState, GridColumnsSettings, GridName } from "../../common/grid-column-types";
import type { GdbSettings } from "../../common/settings-types";

export type UseGridColumnStateResult = {
  /** Saved column states, or undefined if not yet loaded or no saved state. */
  savedColumns: GridColumnState[] | undefined;
  /** Whether the saved state has been loaded (even if no saved state exists). */
  loaded: boolean;
  /** Clear saved state for this grid, reverting to defaults on next render. */
  resetColumnDefaults: () => void;
};

/**
 * Normalizes width into a consistent representation.
 *
 * @param width - Value for `width` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs normalizeWidth as part of this module's internal workflow.
 *
 * @param width - width parameter.
 * @returns The computed result produced by this operation.
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
 * Extracts column state from the provided input.
 *
 * @param columns - Value for `columns` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
/**
 * Performs extractColumnState as part of this module's internal workflow.
 *
 * @param columns - columns parameter.
 * @returns The computed result produced by this operation.
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
 * Performs apply saved columns to grid as part of this module's public API.
 *
 * @param grid - Unique identifier used to look up the target entity.
 * @param savedColumns - Value for `savedColumns` consumed by this operation.
 */
/**
 * Performs applySavedColumnsToGrid as part of this module's internal workflow.
 *
 * @param grid - grid parameter.
 * @param savedColumns - savedColumns parameter.
 * @returns The computed result produced by this operation.
 */
/** @public */
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
 * Performs save columns to settings as part of this module's internal workflow.
 *
 * @param gridName - Value for `gridName` consumed by this operation.
 * @param columns - Value for `columns` consumed by this operation.
 */
/**
 * Performs saveColumnsToSettings as part of this module's internal workflow.
 *
 * @param gridName - gridName parameter.
 * @param columns - columns parameter.
 * @returns The computed result produced by this operation.
 */
function saveColumnsToSettings(gridName: GridName, columns: Column[]): void {
  const state = extractColumnState(columns);
  window.ipcToMain.commands.app.notifyMain({
    command: "save-grid-columns",
    data: { gridName, columns: state },
  });
}

/**
 * Creates and returns the `useGridColumnState` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components.
 *
 * @param gridName - Value for `gridName` consumed by this operation.
 * @param gridRef - Value for `gridRef` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs useGridColumnState as part of this module's internal workflow.
 *
 * @param gridName - gridName parameter.
 * @param gridRef - gridRef parameter.
 * @returns The computed result produced by this operation.
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

    window.ipcToMain.queries.app
      .getSettings()
      .then((settings: GdbSettings) => {
        const gridColumns = settings?.gui?.gridColumns as GridColumnsSettings | undefined;
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

    /**
     * Performs handle resize stop as part of this module's internal workflow.
     */
    const handleResizeStop = () => {
      saveColumnsToSettings(gridNameRef.current, grid.columns as Column[]);
    };

    /**
     * Performs handle action complete as part of this module's internal workflow.
     *
     * @param args - Configuration values that control how this operation executes.
     */
    const handleActionComplete = (args: GridActionEventArgs) => {
      if (args.requestType === "columnstate" || args.requestType === "reorder") {
        saveColumnsToSettings(gridNameRef.current, grid.columns as Column[]);
      }
    };

    /**
     * Performs handle column menu click as part of this module's internal workflow.
     *
     * @param args - Configuration values that control how this operation executes.
     */
    const handleColumnMenuClick = (args: MenuEventArgs) => {
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
    window.ipcToMain.commands.app.notifyMain({
      command: "reset-grid-columns",
      data: gridNameRef.current,
    });
  }, []);

  return { savedColumns, loaded, resetColumnDefaults };
}

/**
 * Performs reset all grid column defaults as part of this module's public API.
 */
/** @public */
export function resetAllGridColumnDefaults(): void {
  window.ipcToMain.commands.app.notifyMain({
    command: "reset-grid-columns",
    data: undefined,
  });
}
