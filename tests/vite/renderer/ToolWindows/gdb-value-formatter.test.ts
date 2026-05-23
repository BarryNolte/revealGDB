// @vitest-environment jsdom
/**
 * Unit tests for parseGdbValue and formatGdbValueHtml.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatGdbValueHtml,
  isComplexValue,
  parseGdbValue,
} from "../../../../src/renderer/ToolWindows/gdb-value-formatter";

// Raw lines from test-files/locals-values-for-render.txt (GDB MI-format, not unescaped)
const DATA_LINES = readFileSync(
  resolve(process.cwd(), "test-files/locals-values-for-render.txt"),
  "utf8",
)
  .split(/\r?\n/)
  .filter(Boolean);
// Line indices (0-based):
// 0: mbs top-level struct
// 1: ms value
// 2: embed_t struct
// 3: scalar integer
// 4: function pointer (esp_chip_info)
// 5: scalar integer (address)
// 6: esp_chip_info struct
// 7: <optimized out>
// 8: function pointer (vTaskDelay)
// 9: char with '@'

// ---------------------------------------------------------------------------
// isComplexValue
// ---------------------------------------------------------------------------

describe("isComplexValue", () => {
  it("returns false for scalars", () => {
    expect(isComplexValue("42")).toBe(false);
    expect(isComplexValue("0x7fff0000")).toBe(false);
    expect(isComplexValue('"hello"')).toBe(false);
  });

  it("returns true for brace-delimited values", () => {
    expect(isComplexValue("{x = 1}")).toBe(true);
    expect(isComplexValue("{}")).toBe(true);
    expect(isComplexValue("  {0, 1, 2}")).toBe(true);
  });

  it("returns false for GDB function pointer format {type} address <symbol>", () => {
    expect(isComplexValue("{void (esp_chip_info_t *)} 0x400d316c <esp_chip_info>")).toBe(false);
    expect(isComplexValue("{void (const TickType_t)} 0x40087700 <vTaskDelay>")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseGdbValue
// ---------------------------------------------------------------------------

describe("parseGdbValue", () => {
  it("parses a scalar integer", () => {
    const node = parseGdbValue("42");
    expect(node.kind).toBe("scalar");
    if (node.kind === "scalar") expect(node.text).toBe("42");
  });

  it("parses a scalar hex value", () => {
    const node = parseGdbValue("0x7fff0000");
    expect(node.kind).toBe("scalar");
    if (node.kind === "scalar") expect(node.text).toBe("0x7fff0000");
  });

  it("parses a scalar string literal", () => {
    const node = parseGdbValue('"hello"');
    expect(node.kind).toBe("scalar");
    if (node.kind === "scalar") expect(node.text).toBe('"hello"');
  });

  it("parses an empty struct {}", () => {
    const node = parseGdbValue("{}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") expect(node.fields).toHaveLength(0);
  });

  it("parses a flat struct", () => {
    const node = parseGdbValue("{x = 1, y = 2}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[0].key).toBe("x");
      expect(node.fields[0].value).toEqual({ kind: "scalar", text: "1" });
      expect(node.fields[1].key).toBe("y");
      expect(node.fields[1].value).toEqual({ kind: "scalar", text: "2" });
    }
  });

  it("parses a nested struct", () => {
    const node = parseGdbValue("{a = 1, b = {c = 2, d = 3}}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[1].key).toBe("b");
      const inner = node.fields[1].value;
      expect(inner.kind).toBe("struct");
      if (inner.kind === "struct") {
        expect(inner.fields).toHaveLength(2);
        expect(inner.fields[0].key).toBe("c");
        expect(inner.fields[1].key).toBe("d");
      }
    }
  });

  it("parses a positional array", () => {
    const node = parseGdbValue("{10, 20, 30}");
    expect(node.kind).toBe("array");
    if (node.kind === "array") {
      expect(node.items).toHaveLength(3);
      expect(node.items[0]).toEqual({ kind: "scalar", text: "10" });
    }
  });

  it("does not split on commas inside string literals", () => {
    const node = parseGdbValue('{msg = "hello, world", val = 5}');
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[0].key).toBe("msg");
      if (node.fields[0].value.kind === "scalar") {
        expect(node.fields[0].value.text).toBe('"hello, world"');
      }
    }
  });

  it("does not split on commas inside char literals", () => {
    const node = parseGdbValue("{ch = ',', n = 1}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[0].key).toBe("ch");
    }
  });

  it("does not split on commas inside nested braces", () => {
    const node = parseGdbValue("{a = {x = 1, y = 2}, b = 3}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
    }
  });

  it("handles deeply nested structs", () => {
    const node = parseGdbValue("{a = {b = {c = {d = 42}}}}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      const aVal = node.fields[0].value; // {b = {c = {d = 42}}}
      expect(aVal.kind).toBe("struct");
      if (aVal.kind === "struct") {
        const bVal = aVal.fields[0].value; // {c = {d = 42}}
        expect(bVal.kind).toBe("struct");
        if (bVal.kind === "struct") {
          const cVal = bVal.fields[0].value; // {d = 42}
          expect(cVal.kind).toBe("struct");
          if (cVal.kind === "struct") {
            const dVal = cVal.fields[0].value; // 42
            expect(dVal).toEqual({ kind: "scalar", text: "42" });
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// formatGdbValueHtml
// ---------------------------------------------------------------------------

describe("formatGdbValueHtml", () => {
  it("wraps a scalar in tip-field-val span", () => {
    const html = formatGdbValueHtml("42");
    expect(html).toBe('<span class="tip-field-val">42</span>');
  });

  it("renders a flat struct as tip-struct with tip-field rows", () => {
    const html = formatGdbValueHtml("{x = 1, y = 2}");
    expect(html).toContain('class="tip-struct"');
    expect(html).toContain('class="tip-field"');
    expect(html).toContain('class="tip-field-name"');
    expect(html).toContain(">x<");
    expect(html).toContain(">y<");
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
  });

  it("renders nested struct fields as collapsible details", () => {
    const html = formatGdbValueHtml("{a = 1, b = {c = 2}}");
    expect(html).toContain('<details class="tip-details">');
    expect(html).toContain('<summary class="tip-summary">');
    expect(html).toContain('class="tip-indent"');
    expect(html).toContain(">b<");
  });

  it("truncates arrays at maxArrayItems (default 10)", () => {
    const items = Array.from({ length: 15 }, (_, i) => i).join(", ");
    const html = formatGdbValueHtml(`{${items}}`);
    expect(html).toContain("5 more");
    expect(html).toContain(">[9]<");
    expect(html).not.toContain(">[10]<");
  });

  it("respects custom maxArrayItems", () => {
    const items = Array.from({ length: 5 }, (_, i) => i).join(", ");
    const html = formatGdbValueHtml(`{${items}}`, { maxArrayItems: 3 });
    expect(html).toContain("2 more");
    expect(html).toContain(">[2]<");
    expect(html).not.toContain(">[3]<");
  });

  it("elides deeply nested content at maxDepth", () => {
    const html = formatGdbValueHtml("{a = {b = {c = {d = {e = {f = 1}}}}}}", { maxDepth: 3 });
    expect(html).toContain("&#x2026;");
  });

  it("escapes HTML special characters in scalar values", () => {
    const html = formatGdbValueHtml("{tag = <b>&</b>}");
    expect(html).toContain("&lt;b&gt;&amp;&lt;/b&gt;");
    expect(html).not.toContain("<b>");
  });

  it("renders empty struct as {} span", () => {
    const html = formatGdbValueHtml("{}");
    expect(html).toContain("{}");
  });

  it("renders single-element no-key block as array with [0] label", () => {
    const html = formatGdbValueHtml("{0}");
    const node = parseGdbValue("{0}");
    expect(node.kind).toBe("array");
    expect(html).toContain(">[0]<");
  });

  it("treats function pointer {type} address <symbol> as scalar", () => {
    const raw = "{void (esp_chip_info_t *)} 0x400d316c <esp_chip_info>";
    const node = parseGdbValue(raw);
    expect(node.kind).toBe("scalar");
    if (node.kind === "scalar") expect(node.text).toBe(raw);
  });

  it("parses struct with anonymous inner struct/union members (key is empty string)", () => {
    // Anonymous union: {f = 0, g = 1} embedded without a field name
    const node = parseGdbValue("{a = 1, {f = 0, g = 1}}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[0].key).toBe("a");
      expect(node.fields[1].key).toBe(""); // anonymous — not "?"
      expect(node.fields[1].value.kind).toBe("struct");
    }
  });

  it("parses anonymous inner struct with mixed named/unnamed entries", () => {
    // parseGdbValue receives post-MI-unescape input (single backslash, plain double-quotes)
    const node = parseGdbValue('{c = "`", <incomplete sequence \\373>, d = 1073430880}');
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(3);
      expect(node.fields[0].key).toBe("c");
      expect(node.fields[1].key).toBe(""); // unnamed entry
      if (node.fields[1].value.kind === "scalar") {
        expect(node.fields[1].value.text).toBe("<incomplete sequence \\373>");
      }
      expect(node.fields[2].key).toBe("d");
    }
  });
});

// ---------------------------------------------------------------------------
// formatGdbValueHtml — anonymous struct rendering
// ---------------------------------------------------------------------------

describe("formatGdbValueHtml — anonymous struct rendering", () => {
  it("renders anonymous inner struct without a field name or '?'", () => {
    const html = formatGdbValueHtml("{a = 1, {f = 0, g = 1}}");
    expect(html).not.toContain("?");
    // Anonymous block renders as collapsible details with just {…} summary
    expect(html).toContain('<details class="tip-details">');
    expect(html).toContain("&#x2026;");
    // Named field is still present
    expect(html).toContain(">a<");
  });

  it("renders anonymous scalar entry without a field name", () => {
    // Post-unescape form: single backslash in incomplete sequence
    const html = formatGdbValueHtml('{c = "`", <incomplete sequence \\373>, d = 5}');
    expect(html).not.toContain("?");
    expect(html).toContain("&lt;incomplete sequence \\373&gt;");
    expect(html).toContain(">c<");
    expect(html).toContain(">d<");
  });

  it("renders function pointer as plain scalar, not broken tree", () => {
    const raw = "{void (esp_chip_info_t *)} 0x400d316c <esp_chip_info>";
    // isComplexValue is false so buildTooltipHtml would not call formatGdbValueHtml;
    // but if called directly, parseGdbValue returns scalar and renderNode wraps it.
    const html = formatGdbValueHtml(raw);
    expect(html).toContain("esp_chip_info");
    // Should not render as a struct tree with [0] index
    expect(html).not.toContain(">[0]<");
  });
});

// ---------------------------------------------------------------------------
// formatGdbValueHtml — data-file smoke tests
// ---------------------------------------------------------------------------

describe("formatGdbValueHtml — data-file smoke tests", () => {
  // Each value comes from test-files/locals-values-for-render.txt

  it("renders a flat struct (model/features/revision/cores)", () => {
    const html = formatGdbValueHtml(
      "{model = 0, features = 2744, revision = 9724, cores = 64 '@'}",
    );
    expect(html).toContain('class="tip-struct"');
    expect(html).toContain(">model<");
    expect(html).toContain(">features<");
    expect(html).toContain(">cores<");
    expect(html).not.toContain("?");
  });

  it("renders the actual ms value from the data file (GDB MI format)", () => {
    // DATA_LINES[1] is the raw GDB MI-format ms value with double backslashes and \" delimiters
    const raw = DATA_LINES[1];
    const html = formatGdbValueHtml(raw);
    expect(html).not.toContain("?");
    // Named top-level fields
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
    expect(html).toContain(">e<");
    expect(html).toContain(">embed_t<");
    expect(html).toContain(">h<");
    // Two anonymous union blocks + embed_t = 3 collapsible details
    const detailCount = (html.match(/<details/g) ?? []).length;
    expect(detailCount).toBeGreaterThanOrEqual(3);
    // Incomplete sequence rendered as HTML-escaped anonymous scalar
    expect(html).toContain("&lt;incomplete sequence");
  });

  it("renders a positional array", () => {
    const html = formatGdbValueHtml("{12, 1073430912, 1073430880, 12, 2, 1}");
    expect(html).toContain(">[0]<");
    expect(html).toContain(">[5]<");
    expect(html).not.toContain("?");
  });

  it("handles struct with char-value scalars like 252 '\\374'", () => {
    const html = formatGdbValueHtml("{b = 252 '\\374', e = 12 '\\f'}");
    expect(html).toContain(">b<");
    expect(html).toContain(">e<");
    expect(html).not.toContain("?");
  });
});

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------

describe("escapeHtml", () => {
  it("escapes & < >", () => {
    expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("returns string unchanged when no special chars", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });

  it("escapes multiple occurrences", () => {
    expect(escapeHtml("<<>>&&")).toBe("&lt;&lt;&gt;&gt;&amp;&amp;");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// unescapeGdbMiValue — exercised via formatGdbValueHtml
// ---------------------------------------------------------------------------

describe("formatGdbValueHtml — MI unescape", () => {
  it("unescapes \\\\ (double backslash in MI) to single backslash", () => {
    // MI encodes a literal backslash as \\
    // JavaScript string "\\\\n" represents the 3-char sequence: backslash backslash n
    // After unescape this becomes: backslash n → which is a literal \n in the scalar
    const html = formatGdbValueHtml("{v = \\\\n}");
    expect(html).toContain("\\n");
  });

  it('unescapes \\" (escaped quote in MI) to double quote', () => {
    // MI encodes a literal " as \"
    // JavaScript string '\\\"hello\\\"' represents the chars: \" h e l l o \"
    // After unescape this becomes: "hello"
    const html = formatGdbValueHtml('{msg = \\"hello\\"}');
    expect(html).toContain('"hello"');
  });

  it("passes through \\n (MI newline escape) unchanged", () => {
    // \\n in MI is not one of the two special cases (only \\ and \" are unescaped)
    // so the backslash is kept as-is
    const html = formatGdbValueHtml("{s = \\n}");
    // The backslash is kept; HTML-escaping doesn't affect it
    expect(html).toContain("\\n");
  });

  it("handles a trailing backslash at end of string (no following char)", () => {
    // Edge case: backslash at the very last position of the string.
    // The loop condition is `i + 1 < s.length`, so the backslash is output as-is.
    const html = formatGdbValueHtml("{v = x\\}");
    // The backslash is preserved in the output
    expect(html).toContain("x\\");
  });

  it("renders plain string with no backslashes unchanged", () => {
    const html = formatGdbValueHtml("{key = value}");
    expect(html).toContain(">key<");
    expect(html).toContain(">value<");
  });
});

// ---------------------------------------------------------------------------
// splitTopLevel edge cases (exercised via parseGdbValue)
// ---------------------------------------------------------------------------

describe("parseGdbValue — splitTopLevel edge cases", () => {
  it("returns empty struct for {,} (comma-only inner → empty parts list)", () => {
    // splitTopLevel(","): ch=',' at depth 0 → part="".trim()="" → if(part) FALSE
    // end: last="" → if(last) FALSE → returns []
    // parseGdbValue: parts.length===0 → if(parts.length===0) TRUE branch taken
    const node = parseGdbValue("{,}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") expect(node.fields).toHaveLength(0);
  });

  it("returns empty struct for {,,} (multiple commas, no content)", () => {
    const node = parseGdbValue("{,,}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") expect(node.fields).toHaveLength(0);
  });

  it("handles anonymous complex member in a struct (isComplexValue branch)", () => {
    // First part 'a = 1' matches STRUCT_FIELD_RE.
    // Second part '{x = 2}' does NOT match STRUCT_FIELD_RE but IS a complex value.
    // Exercises the `if (isComplexValue(part))` branch inside the struct field mapper.
    const node = parseGdbValue("{a = 1, {x = 2}}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[0].key).toBe("a");
      expect(node.fields[1].key).toBe(""); // anonymous
      expect(node.fields[1].value.kind).toBe("struct");
    }
  });

  it("handles anonymous scalar member in a struct (plain fallback branch)", () => {
    // First part 'a = 1' matches. Second part '99' is neither keyed nor complex.
    // Exercises: return { key: "", value: { kind: "scalar", text: part } }
    const node = parseGdbValue("{a = 1, 99}");
    expect(node.kind).toBe("struct");
    if (node.kind === "struct") {
      expect(node.fields).toHaveLength(2);
      expect(node.fields[1].key).toBe("");
      expect(node.fields[1].value).toEqual({ kind: "scalar", text: "99" });
    }
  });
});
