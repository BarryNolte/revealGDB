import { describe, expect, it } from "vitest";
import { getValueType, isValidValue, validateValue, ValueType } from "./valueValidation";

describe("valueValidation", () => {
  describe("Dollar Prefix Format", () => {
    it("should validate simple dollar prefix with alphanumeric characters", () => {
      const result = validateValue("$abc123");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
      expect(result.hexValue).toBeNull();
      expect(result.decimalValue).toBeNull();
    });

    it("should validate dollar prefix with single character", () => {
      const result = validateValue("$a");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should validate dollar prefix with single character", () => {
      const result = validateValue("$bbbbbbbbbbbbbb");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should validate dollar prefix with 32 characters (max length)", () => {
      const input = "$" + "a".repeat(32);
      const result = validateValue(input);
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should validate dollar prefix with uppercase letters", () => {
      const result = validateValue("$ABCDEF");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should validate dollar prefix with mixed case", () => {
      const result = validateValue("$AbC123xYz");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should trim whitespace for dollar prefix", () => {
      const result = validateValue("  $AbC123xYz  ");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should validate dollar prefix with numbers", () => {
      const result = validateValue("$0123456789");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.DollarPrefix);
    });

    it("should reject dollar prefix with more than 32 characters", () => {
      const input = "$" + "a".repeat(33);
      const result = validateValue(input);
      expect(result.isValid).toBe(false);
    });

    it("should reject dollar prefix with no characters after $", () => {
      const result = validateValue("$");
      expect(result.isValid).toBe(false);
    });

    it("should reject dollar prefix with special characters", () => {
      const result = validateValue("$abc-def");
      expect(result.isValid).toBe(false);
    });

    it("should reject dollar prefix with spaces", () => {
      const result = validateValue("$abc def");
      expect(result.isValid).toBe(false);
    });

    it("should reject string starting with $ but not matching format", () => {
      const result = validateValue("$_underscore");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Hexadecimal Format", () => {
    it("should validate hex number with 0x prefix", () => {
      const result = validateValue("0x1A2B");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0x1A2B");
      expect(result.decimalValue).toBe(6699);
    });

    it("should validate hex number without 0x prefix", () => {
      const result = validateValue("FF00");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xFF00");
      expect(result.decimalValue).toBe(65280);
    });

    it("should trim whitespace for hex", () => {
      const result = validateValue("  0x1A2B  ");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0x1A2B");
      expect(result.decimalValue).toBe(6699);
    });

    it("should validate lowercase hex letters", () => {
      const result = validateValue("0xabcdef");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xabcdef");
      expect(result.decimalValue).toBe(11259375);
    });

    it("should validate uppercase hex letters", () => {
      const result = validateValue("0xABCDEF");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xABCDEF");
      expect(result.decimalValue).toBe(11259375);
    });

    it("should validate mixed case hex", () => {
      const result = validateValue("0xAbCdEf");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xAbCdEf");
      expect(result.decimalValue).toBe(11259375);
    });

    it("should validate single hex digit", () => {
      const result = validateValue("A");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xA");
      expect(result.decimalValue).toBe(10);
    });

    it("should validate hex zero", () => {
      const result = validateValue("0x0");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0x0");
      expect(result.decimalValue).toBe(0);
    });

    it("should validate decimal-only numbers as hex (per spec)", () => {
      const result = validateValue("123");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0x123");
      expect(result.decimalValue).toBe(0x123); // 291 in decimal
    });

    it("should validate large hex numbers", () => {
      const result = validateValue("0xFFFFFFFF");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0xFFFFFFFF");
      expect(result.decimalValue).toBe(4294967295);
    });
  });

  describe("Base 10 Format", () => {
    it("should NOT treat pure decimal as Base10 (treated as hex per spec)", () => {
      const result = validateValue("123");
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal); // Should be treated as hex, not base10
    });

    it("should NOT treat negative numbers", () => {
      const result = validateValue("-123");
      expect(result.isValid).toBe(false);
    });

    it("should NOT treat decimal numbers with decimals", () => {
      const result = validateValue("123.45");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Invalid Inputs", () => {
    it("should reject undefined input", () => {
      const result = validateValue(undefined);
      expect(result.isValid).toBe(false);
      expect(result.valueType).toBeNull();
      expect(result.hexValue).toBeNull();
      expect(result.decimalValue).toBeNull();
    });

    it("should reject empty string", () => {
      const result = validateValue("");
      expect(result.isValid).toBe(false);
    });

    it("should reject whitespace-only string", () => {
      const result = validateValue("   ");
      expect(result.isValid).toBe(false);
    });

    it("should reject string with only $", () => {
      const result = validateValue("$");
      expect(result.isValid).toBe(false);
    });

    it("should reject invalid hex characters", () => {
      const result = validateValue("0xGHIJKL");
      expect(result.isValid).toBe(false);
    });

    it("should reject string with spaces", () => {
      const result = validateValue("0x 123");
      expect(result.isValid).toBe(false);
    });

    it("should reject string with special characters", () => {
      const result = validateValue("0x@#$%");
      expect(result.isValid).toBe(false);
    });

    it("should reject 0x with no following digits", () => {
      const result = validateValue("0x");
      expect(result.isValid).toBe(false);
    });

    it("should reject arbitrary text", () => {
      const result = validateValue("hello");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Convenience Functions", () => {
    describe("isValidValue", () => {
      it("should return true for valid dollar prefix", () => {
        expect(isValidValue("$abc123")).toBe(true);
      });

      it("should return true for valid hex", () => {
        expect(isValidValue("0xDEADBEEF")).toBe(true);
      });

      it("should return true for valid decimal (treated as hex)", () => {
        expect(isValidValue("123")).toBe(true);
      });

      it("should return false for invalid input", () => {
        expect(isValidValue("invalid")).toBe(false);
      });

      it("should return false for undefined input", () => {
        expect(isValidValue(undefined)).toBe(false);
      });
    });

    describe("getValueType", () => {
      it("should return ValueType.DollarPrefix for dollar prefix", () => {
        expect(getValueType("$abc")).toBe(ValueType.DollarPrefix);
      });

      it("should return ValueType.Hexadecimal for hex", () => {
        expect(getValueType("0xABC")).toBe(ValueType.Hexadecimal);
      });

      it("should return null for invalid input", () => {
        expect(getValueType("invalid")).toBeNull();
      });

      it("should return null for undefined input", () => {
        expect(getValueType(undefined)).toBeNull();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long hex values", () => {
      const result = validateValue("0x" + "F".repeat(16));
      expect(result.isValid).toBe(true);
      expect(result.valueType).toBe(ValueType.Hexadecimal);
      expect(result.hexValue).toBe("0x" + "F".repeat(16));
      expect(typeof result.decimalValue).toBe("number");
    });

    it("should handle dollar prefix at maximum length", () => {
      const maxLengthDollarString = "$" + "aAbBcC0099".repeat(3) + "aAbBc";
      const result = validateValue(maxLengthDollarString);
      expect(result.isValid).toBe(false);
      expect(result.valueType).toBe(null);
    });

    it("should not confuse $ in middle of string", () => {
      const result = validateValue("abc$def");
      expect(result.isValid).toBe(false);
    });

    it("should not confuse 0x in middle of string", () => {
      const result = validateValue("abc0x123");
      expect(result.isValid).toBe(false);
    });

    it("should handle case sensitivity correctly for dollar prefix", () => {
      const result1 = validateValue("$ABC");
      const result2 = validateValue("$abc");
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });
});
