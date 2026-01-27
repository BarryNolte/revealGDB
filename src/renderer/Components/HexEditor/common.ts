/**
 * @file common.ts
 * @description Shared enumerations and utility functions for the HexEditor application.
 * Provides data type definitions and character conversion utilities used across views.
 */

/**
 * Enum defining pointer size constants used for memory offset calculations.
 */
export const enum PointerSize {
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
export const enum DataViewEnum {
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
export const enum TextViewEnum {
  none,
  ascii,
  unicode,
}

/**
 * Converts a byte value to its character representation.
 * @param byte - The byte value (0-255) to convert
 * @param isUnicode - If true, uses full Unicode; if false, uses ASCII with fallback to '.'
 * @returns The character representation of the byte, or '.' if unprintable
 */
export function convertCharValue(byte: number, isUnicode: boolean): string {
  return isUnicode
    ? String.fromCharCode(byte)
    : // ASCII mode: only show printable characters (0x20-0x7F), otherwise show '.'
      byte >= 32 && byte < 0x80
      ? String.fromCharCode(byte)
      : ".";
}
