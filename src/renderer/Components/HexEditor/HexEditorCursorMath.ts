export const HEX_EDITOR_ROW_WIDTH = 16;

export function clampIndex(index: number, datasourceLength: number): number {
  if (index < 0) {
    return 0;
  }

  if (index >= datasourceLength) {
    return datasourceLength - 1;
  }

  return index;
}

export function parseIndexFromId(id: string): number | null {
  const parts = id.split("-");
  if (parts.length < 2) {
    return null;
  }

  const parsed = parseInt(parts[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getRowFromIndex(index: number): number {
  return Math.floor(index / HEX_EDITOR_ROW_WIDTH);
}

export function getColumnFromIndex(index: number): number {
  return index % HEX_EDITOR_ROW_WIDTH;
}
