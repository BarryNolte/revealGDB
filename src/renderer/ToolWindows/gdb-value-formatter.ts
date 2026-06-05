/**
 * Parser and HTML renderer for GDB value strings.
 *
 * @remarks
 * GDB MI protocol transmits values as c-strings where `\\` encodes a single
 * backslash and `\"` encodes a double-quote.  `formatGdbValueHtml` accepts
 * raw MI-format strings and unescapes that outer layer before parsing.
 *
 * After unescaping, value shapes are:
 *   - scalar:  `42`, `0x7fff0000`, `"hello"`, `3.14`
 *   - struct:  `{bar = 3, baz = 4, xax = {har = 3}}`
 *   - array:   `{0, 1, 2, 3}` (no keys)
 *
 * `formatGdbValueHtml` converts these to an interactive HTML tree using
 * `<details>`/`<summary>` for collapsible nested nodes and truncates long arrays.
 */

/** A parsed GDB value node. */
export type GdbValueNode =
  | { kind: "scalar"; text: string }
  | { kind: "struct"; fields: Array<{ key: string; value: GdbValueNode }> }
  | { kind: "array"; items: GdbValueNode[] };

/** Options for {@link formatGdbValueHtml}. */
export interface GdbValueFormatOptions {
  /** Maximum array items to show before truncating with `…(N more)`. Default: `10`. */
  maxArrayItems?: number;
  /** Maximum nesting depth before eliding children as `{…}`. Default: `5`. */
  maxDepth?: number;
}

/**
 * Returns `true` when `raw` is a self-contained GDB struct or array value (`{…}`).
 *
 * @remarks
 * Function pointers are formatted by GDB as `{type} address <symbol>` — they
 * start with `{` but have content after the closing brace.  Those return `false`
 * so they are displayed as plain scalars rather than broken trees.
 */
/**
 * Performs isComplexValue as part of this module's internal workflow.
 *
 * @param raw - raw parameter.
 * @returns The computed result produced by this operation.
 */
export function isComplexValue(raw: string): boolean {
  const s = raw.trim();
  return s.startsWith("{") && s.endsWith("}");
}

/**
 * Consumes a string (`"…"`) or char (`'…'`) literal from `inner` beginning at
 * `start` (the opening quote), handling `\x` escape sequences.
 * Returns the consumed text and the index **of** the closing quote.
 */
function consumeQuotedLiteral(
  inner: string,
  start: number,
  closeChar: string,
): { end: number; text: string } {
  let text = inner[start]; // opening quote
  let i = start + 1;
  while (i < inner.length) {
    const ch = inner[i];
    if (ch === "\\" && i + 1 < inner.length) {
      text += ch + inner[++i];
    } else {
      text += ch;
      if (ch === closeChar) break;
    }
    i++;
  }
  return { end: i, text };
}

/**
 * Splits the contents of a `{…}` block at top-level commas, respecting nested
 * braces and string / char literals so that inner commas are never split on.
 */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let i = 0;

  while (i < inner.length) {
    const ch = inner[i];
    if (ch === '"' || ch === "'") {
      const lit = consumeQuotedLiteral(inner, i, ch);
      current += lit.text;
      i = lit.end + 1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      const part = current.trim();
      if (part) parts.push(part);
      current = "";
      i++;
      continue;
    }
    current += ch;
    i++;
  }

  const last = current.trim();
  if (last) parts.push(last);
  return parts;
}

const STRUCT_FIELD_RE = /^(\w+)\s*=\s*([\s\S]*)$/;

/**
 * Recursively parse a raw GDB value string into a {@link GdbValueNode} tree.
 *
 * @param raw - The raw string from GDB (e.g. `{bar = 3, xax = {har = 3}}`).
 */
export function parseGdbValue(raw: string): GdbValueNode {
  const trimmed = raw.trim();

  // Non-struct scalar, OR function pointer `{type} address <symbol>` (starts
  // with `{` but the matching `}` is not the last character).
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return { kind: "scalar", text: trimmed };
  }

  // Strip outer braces
  const inner = trimmed.slice(1, trimmed.length - 1).trim();
  if (!inner) return { kind: "struct", fields: [] };

  const parts = splitTopLevel(inner);
  if (parts.length === 0) return { kind: "struct", fields: [] };

  // If the first part matches "key = value" treat the whole block as a struct.
  // Anonymous struct/union members (no key prefix) are represented with key: ""
  // so the renderer omits the name and equals sign.
  if (STRUCT_FIELD_RE.test(parts[0])) {
    const fields = parts.map((part) => {
      const m = STRUCT_FIELD_RE.exec(part);
      if (m) return { key: m[1], value: parseGdbValue(m[2].trim()) };
      if (isComplexValue(part)) return { key: "", value: parseGdbValue(part) };
      return { key: "", value: { kind: "scalar" as const, text: part } };
    });
    return { kind: "struct", fields };
  }

  // Otherwise treat the block as a positional array.
  return { kind: "array", items: parts.map((p) => parseGdbValue(p)) };
}
/**
 * Performs escapeHtml as part of this module's internal workflow.
 *
 * @param s - s parameter.
 * @returns The computed result produced by this operation.
 */

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/**
 * Performs renderField as part of this module's internal workflow.
 *
 * @param key - key parameter.
 * @param value - value parameter.
 * @param depth - depth parameter.
 * @param maxDepth - maxDepth parameter.
 * @param maxArrayItems - maxArrayItems parameter.
 * @returns The computed result produced by this operation.
 */

function renderField(
  key: string,
  value: GdbValueNode,
  depth: number,
  maxDepth: number,
  maxArrayItems: number,
): string {
  if (value.kind === "scalar") {
    if (!key) {
      // Anonymous / unnamed inline member — show value only.
      return `<div class="tip-field"><span class="tip-field-val">${escapeHtml(value.text)}</span></div>`;
    }
    return (
      `<div class="tip-field">` +
      `<span class="tip-field-name">${key}</span>` +
      `<span class="tip-eq"> = </span>` +
      `<span class="tip-field-val">${escapeHtml(value.text)}</span>` +
      `</div>`
    );
  }

  const inner = renderNode(value, depth + 1, maxDepth, maxArrayItems);
  if (!key) {
    // Anonymous struct/union — collapsible but no field name.
    return (
      `<details class="tip-details">` +
      `<summary class="tip-summary">` +
      `<span class="tip-field-val">{&#x2026;}</span>` +
      `</summary>` +
      `<div class="tip-indent">${inner}</div>` +
      `</details>`
    );
  }
  return (
    `<details class="tip-details">` +
    `<summary class="tip-summary">` +
    `<span class="tip-field-name">${key}</span>` +
    `<span class="tip-eq"> = </span>` +
    `<span class="tip-field-val">{&#x2026;}</span>` +
    `</summary>` +
    `<div class="tip-indent">${inner}</div>` +
    `</details>`
  );
}
/**
 * Performs renderNode as part of this module's internal workflow.
 *
 * @param node - node parameter.
 * @param depth - depth parameter.
 * @param maxDepth - maxDepth parameter.
 * @param maxArrayItems - maxArrayItems parameter.
 * @returns The computed result produced by this operation.
 */

function renderNode(
  node: GdbValueNode,
  depth: number,
  maxDepth: number,
  maxArrayItems: number,
): string {
  if (node.kind === "scalar") {
    return `<span class="tip-field-val">${escapeHtml(node.text)}</span>`;
  }

  if (depth >= maxDepth) {
    return `<span class="tip-field-val">{&#x2026;}</span>`;
  }

  if (node.kind === "struct") {
    if (node.fields.length === 0) return `<span class="tip-field-val">{}</span>`;
    const rows = node.fields.map(({ key, value }) =>
      renderField(escapeHtml(key), value, depth, maxDepth, maxArrayItems),
    );
    return `<div class="tip-struct">${rows.join("")}</div>`;
  }

  // array
  if (node.items.length === 0) return `<span class="tip-field-val">[]</span>`;
  const shown = node.items.slice(0, maxArrayItems);
  const truncCount = node.items.length - shown.length;
  const rows = shown.map((item, i) => renderField(`[${i}]`, item, depth, maxDepth, maxArrayItems));
  if (truncCount > 0) {
    rows.push(`<div class="tip-truncated">&#x2026;(${truncCount} more)</div>`);
  }
  return `<div class="tip-struct">${rows.join("")}</div>`;
}

/**
 * Removes the outer GDB MI c-string escaping layer.
 *
 * @remarks
 * In GDB MI output, the value is transmitted inside a c-string where:
 * - `\\` represents a single backslash in the actual value.
 * - `\"` represents a double-quote in the actual value.
 * Other `\x` sequences (e.g. `\n`, `\374`) are left as-is so that char
 * and string literal text is preserved for display.
 */
/**
 * Performs unescapeGdbMiValue as part of this module's internal workflow.
 *
 * @param s - s parameter.
 * @returns The computed result produced by this operation.
 */
function unescapeGdbMiValue(s: string): string {
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === "\\" || next === '"') {
        result += next;
        i++;
        continue;
      }
    }
    result += s[i];
  }
  return result;
}

/**
 * Converts a raw GDB value string into formatted HTML.
 *
 * @remarks
 * Accepts raw GDB MI-format strings (with `\\` and `\"` escaping).  Scalar
 * values are returned as a plain `tip-field-val` span.  Struct and array
 * values are rendered as an indented tree where nested complex fields use
 * `<details>`/`<summary>` to allow collapsing in the tooltip.
 *
 * @param raw - Raw GDB MI value string.
 * @param opts - Formatting options (array truncation length, max depth).
 */
/**
 * Performs formatGdbValueHtml as part of this module's internal workflow.
 *
 * @param raw - raw parameter.
 * @param opts? - opts? parameter.
 * @returns The computed result produced by this operation.
 */
export function formatGdbValueHtml(raw: string, opts?: GdbValueFormatOptions): string {
  const maxArrayItems = opts?.maxArrayItems ?? 10;
  const maxDepth = opts?.maxDepth ?? 5;
  return renderNode(parseGdbValue(unescapeGdbMiValue(raw)), 0, maxDepth, maxArrayItems);
}
