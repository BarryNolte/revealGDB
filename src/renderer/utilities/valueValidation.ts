/**
 * Provides value validation renderer utilities for formatting, state shaping, and shared view logic.
 *
 * @remarks
 * Exported symbols include `ValueType`, `ValidationResult`, `validateValue`, `isValidValue`, `getValueType`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
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
 * Performs validate value as part of this module's public API.
 *
 * @param input - Value for `input` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs validateValue as part of this module's internal workflow.
 *
 * @param input - input parameter.
 * @returns The computed result produced by this operation.
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
 * Performs is valid value as part of this module's public API.
 *
 * @param input - Value for `input` consumed by this operation.
 * @returns True when the operation succeeds; otherwise false.
 */
/**
 * Performs isValidValue as part of this module's internal workflow.
 *
 * @param input - input parameter.
 * @returns The computed result produced by this operation.
 */
export function isValidValue(input: string | undefined): boolean {
  const result = validateValue(input);
  return result.isValid;
}

/**
 * Returns value type from current state.
 *
 * @param input - Value for `input` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs getValueType as part of this module's internal workflow.
 *
 * @param input - input parameter.
 * @returns The computed result produced by this operation.
 */
export function getValueType(input: string | undefined): ValueType | null {
  const result = validateValue(input);
  return result.isValid ? result.valueType : null;
}
