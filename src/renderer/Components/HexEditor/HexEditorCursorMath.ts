/**
 * Provides hex editor cursor math behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `HEX_EDITOR_ROW_WIDTH`, `clampIndex`, `parseIndexFromId`, `getRowFromIndex`, `getColumnFromIndex`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export const HEX_EDITOR_ROW_WIDTH = 16;

/**
 * Performs clamp index as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param index - Zero-based index used to address a specific item.
 * @param datasourceLength - Value for `datasourceLength` consumed by this operation.
 * @returns The resulting numeric value produced by this operation.
 */
export function clampIndex(index: number, datasourceLength: number): number {
  if (index < 0) {
    return 0;
  }

  if (index >= datasourceLength) {
    return datasourceLength - 1;
  }

  return index;
}

/**
 * Parses input into index from id data.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param id - Unique identifier used to look up the target entity.
 * @returns The computed result produced by this operation.
 */
export function parseIndexFromId(id: string): number | null {
  const parts = id.split("-");
  if (parts.length < 2) {
    return null;
  }

  const parsed = parseInt(parts[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Returns row from index from current state.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param index - Zero-based index used to address a specific item.
 * @returns The resulting numeric value produced by this operation.
 */
export function getRowFromIndex(index: number): number {
  return Math.floor(index / HEX_EDITOR_ROW_WIDTH);
}

/**
 * Returns column from index from current state.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param index - Zero-based index used to address a specific item.
 * @returns The resulting numeric value produced by this operation.
 */
export function getColumnFromIndex(index: number): number {
  return index % HEX_EDITOR_ROW_WIDTH;
}
