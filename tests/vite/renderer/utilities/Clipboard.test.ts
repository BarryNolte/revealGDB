/**
 * Implements Clipboard.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  doCutCopyPaste,
  menuCopy,
  menuCopyAll,
  menuCutCopyPaste,
  menuGutterSourceWindow,
  menuSourceWindow,
  sendTextToClipboard,
} from "../../../../src/renderer/utilities/Clipboard";

describe("Clipboard constants", () => {
  it("menuCopy has one item with text 'Copy'", () => {
    expect(menuCopy).toHaveLength(1);
    expect(menuCopy[0].text).toBe("Copy");
  });

  it("menuCopyAll has two items", () => {
    expect(menuCopyAll).toHaveLength(2);
    expect(menuCopyAll[0].text).toBe("Copy");
    expect(menuCopyAll[1].text).toBe("Copy All");
  });

  it("menuCutCopyPaste has Cut, Copy, Paste", () => {
    expect(menuCutCopyPaste).toHaveLength(3);
    expect(menuCutCopyPaste.map((m) => m.text)).toEqual(["Cut", "Copy", "Paste"]);
  });

  it("menuSourceWindow contains expected actions", () => {
    const ids = menuSourceWindow.filter((m) => "id" in m).map((m) => (m as { id: string }).id);
    expect(ids).toContain("copy");
    expect(ids).toContain("bp-toggle");
    expect(ids).toContain("bp-set");
    expect(ids).toContain("bp-clear");
    expect(ids).toContain("bp-run-to-cursor");
  });

  it("menuGutterSourceWindow contains gutter breakpoint actions", () => {
    const ids = menuGutterSourceWindow
      .filter((m) => "id" in m)
      .map((m) => (m as { id: string }).id);
    expect(ids).toContain("bp-toggle");
    expect(ids).toContain("bp-set");
    expect(ids).toContain("bp-clear");
  });
});

describe("sendTextToClipboard", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls navigator.clipboard.writeText with the provided text", async () => {
    sendTextToClipboard("hello world");
    // let the Promise resolve
    await Promise.resolve();
    expect(writeTextMock).toHaveBeenCalledWith("hello world");
  });

  it("does not throw when clipboard write fails", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => sendTextToClipboard("test")).not.toThrow();
    await Promise.resolve();
  });
});

describe("doCutCopyPaste", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;
  let readTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    readTextMock = vi.fn().mockResolvedValue("clipboard text");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock, readText: readTextMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
/**
 * Performs makeInput as part of this module's internal workflow.
 *
 * @param value - value parameter.
 * @param selStart - selStart parameter.
 * @param selEnd - selEnd parameter.
 * @returns The computed result produced by this operation.
 */

  function makeInput(value = "", selStart = 0, selEnd = 0): HTMLInputElement {
    const input = document.createElement("input");
    input.value = value;
    input.setSelectionRange(selStart, selEnd);
    document.body.appendChild(input);
    return input;
  }

  it("Copy command calls sendTextToClipboard with selected text", async () => {
    const input = makeInput("hello world", 0, 5);

    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "hello",
    } as Selection);

    doCutCopyPaste("Copy", input);
    await Promise.resolve();

    expect(writeTextMock).toHaveBeenCalledWith("hello");
  });

  it("Cut command copies selection and removes it from input", async () => {
    const input = makeInput("hello world", 0, 5);

    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "hello",
    } as Selection);

    doCutCopyPaste("Cut", input);
    await Promise.resolve();

    expect(writeTextMock).toHaveBeenCalledWith("hello");
    expect(input.value).toBe(" world");
  });

  it("Paste command inserts clipboard text at cursor position", async () => {
    const input = makeInput("hello world", 5, 5);

    doCutCopyPaste("Paste", input);
    await Promise.resolve();
    // readText is async, wait one tick
    await new Promise((r) => setTimeout(r, 0));

    expect(readTextMock).toHaveBeenCalled();
    expect(input.value).toBe("helloclipboard text world");
  });

  it("Copy All command copies text content from all defaultRow elements", async () => {
    document.body.innerHTML = `
      <div class="defaultRow">row one</div>
      <div class="defaultRow">row two</div>
    `;
    const input = makeInput();

    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "",
    } as Selection);

    doCutCopyPaste("Copy All", input);
    await Promise.resolve();

    expect(writeTextMock).toHaveBeenCalledWith("row one\nrow two");
  });

  it("unknown command is ignored without throwing", () => {
    const input = makeInput("value", 0, 0);
    expect(() => doCutCopyPaste("Unknown", input)).not.toThrow();
  });

  it("Copy with null selection uses empty string", async () => {
    vi.spyOn(window, "getSelection").mockReturnValue(null);
    const input = makeInput("hello", 0, 0);
    doCutCopyPaste("Copy", input);
    await Promise.resolve();
    expect(writeTextMock).toHaveBeenCalledWith("");
  });

  it("Cut uses element.value.length when selectionStart is null", async () => {
    const input = makeInput("hello world", 0, 5);
    Object.defineProperty(input, "selectionStart", { get: () => null, configurable: true });
    Object.defineProperty(input, "selectionEnd", { get: () => null, configurable: true });

    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "" } as Selection);

    doCutCopyPaste("Cut", input);
    await Promise.resolve();

    // When both start and end are null, falls back to value.length → removes nothing
    expect(input.value).toBe("hello world");
  });

  it("Paste uses element.value.length as fallback when selectionStart/End are null", async () => {
    const input = makeInput("hello", 0, 0);
    Object.defineProperty(input, "selectionStart", { get: () => null, configurable: true });
    Object.defineProperty(input, "selectionEnd", { get: () => null, configurable: true });

    doCutCopyPaste("Paste", input);
    await new Promise((r) => setTimeout(r, 0));

    // clipboard text "clipboard text" inserted at end (length 5)
    expect(input.value).toBe("helloclipboard text");
  });

  it("Paste does not throw when readText rejects", async () => {
    readTextMock.mockRejectedValue(new Error("denied"));
    const input = makeInput("hello", 0, 0);
    expect(() => doCutCopyPaste("Paste", input)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    // No crash — the .catch handler swallows the error
  });
});
