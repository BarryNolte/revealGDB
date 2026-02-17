/**
 * Enum for the type of validated value
 */
export enum ValueType {
  DollarPrefix = "DollarPrefix",
  Hexadecimal = "Hexadecimal",
  Base10 = "Base10",
}

/**
 * Validation result struct
 */
export interface ValidationResult {
  isValid: boolean;
  valueType: ValueType | null;
  hexValue: string | null;
  decimalValue: number | null;
}

/**
 * Validates a string against multiple criteria:
 * - Dollar-prefixed alphanumeric: $aaaaaaaaaaa (up to 32 chars)
 * - Hexadecimal number (with or without 0x prefix)
 * - Base 10 number
 *
 * Note: If a string is valid in both hex and base 10, it's treated as hexadecimal.
 * Note: Undefined input returns invalid.
 *
 * @param input - The string to validate (or undefined)
 * @returns A ValidationResult object with isValid, valueType, hexValue, and decimalValue
 */
export function validateValue(input: string | undefined): ValidationResult {
  // Return invalid for undefined input
  if (input === undefined) {
    return { isValid: false, valueType: null, hexValue: null, decimalValue: null };
  }

  const trimmedInput = input.trim();

  // Check for dollar prefix format: $aaaaaaaaaaa (up to 32 alphanumeric chars)
  const dollarRegex = /^\$[a-zA-Z0-9]{1,32}$/;
  if (dollarRegex.test(trimmedInput)) {
    return { isValid: true, valueType: ValueType.DollarPrefix, hexValue: null, decimalValue: null };
  }

  // Check for hexadecimal number (with or without 0x prefix)
  // Note: This check is performed before base10 because all valid base10 numbers
  // are also valid hexadecimal, and per requirements, we treat them as hex
  const hexRegex = /^(0x)?[0-9a-fA-F]+$/;
  if (hexRegex.test(trimmedInput)) {
    const hexValue = trimmedInput.startsWith("0x") ? trimmedInput : `0x${trimmedInput}`;
    const decimalValue = parseInt(trimmedInput, 16);
    return { isValid: true, valueType: ValueType.Hexadecimal, hexValue, decimalValue };
  }

  // Invalid input
  return { isValid: false, valueType: null, hexValue: null, decimalValue: null };
}

/**
 * Convenience function to check if a value is valid
 */
export function isValidValue(input: string | undefined): boolean {
  const result = validateValue(input);
  return result.isValid;
}

/**
 * Convenience function to get only the value type
 */
export function getValueType(input: string | undefined): ValueType | null {
  const result = validateValue(input);
  return result.isValid ? result.valueType : null;
}
