/**
 * Implements grid column types for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `GridColumnState`, `GridName`, `GridColumnsSettings`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
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
