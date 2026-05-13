/**
 * Provides common behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `PointerSize`, `DataViewEnum`, `TextViewEnum`, `convertCharValue`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export enum PointerSize {
  bit16 = 4,
  bit32 = 8,
  bit64 = 16,
}

/**
 * Enum for data view display formats.
 * - Byte1: Single byte (hex pair)
 * - Byte2: 16-bit word
 * - Byte4: 32-bit word
 * - Byte8: 64-bit word
 * - Float32: 32-bit floating point
 * - Float64: 64-bit floating point
 */
export enum DataViewEnum {
  Byte1 = 0,
  Byte2,
  Byte4,
  Byte8,
  Float32,
  Float64,
}

/**
 * Enum for text view display modes.
 * - none: No text representation
 * - ascii: ASCII character display (7-bit printable)
 * - unicode: Full Unicode character support
 */
export enum TextViewEnum {
  none,
  ascii,
  unicode,
}

/**
 * Performs convert char value as part of this module's public API.
 *
 * @remarks
 * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
 *
 * @param byte - Value for `byte` consumed by this operation.
 * @param isUnicode - Value for `isUnicode` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
export function convertCharValue(byte: number, isUnicode: boolean): string {
  return isUnicode
    ? String.fromCharCode(byte)
    : // ASCII mode: only show printable characters (0x20-0x7F), otherwise show '.'
      byte >= 32 && byte < 0x80
      ? String.fromCharCode(byte)
      : ".";
}
