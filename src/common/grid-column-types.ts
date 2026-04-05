/**
 * Types for persisting SyncFusion grid column state (width, visibility, order).
 */

/** Persisted state for a single grid column. */
export type GridColumnState = {
  field: string;
  width: number | string;
  visible: boolean;
  index: number;
};

/** Grid names that support column persistence. */
export type GridName = "locals" | "disassembly" | "registers" | "callstack" | "breakpoints";

/** Map of grid names to their saved column states. */
export type GridColumnsSettings = Partial<Record<GridName, GridColumnState[]>>;
