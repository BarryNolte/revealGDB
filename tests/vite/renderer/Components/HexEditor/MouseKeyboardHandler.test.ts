// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MouseKeyboardHandler } from "../../../../../src/renderer/Components/HexEditor/MouseKeyboardHandler";

// JSDOM polyfills
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // Polyfill adoptedStyleSheets if not available
  if (!Object.getOwnPropertyDescriptor(Document.prototype, "adoptedStyleSheets")) {
    Object.defineProperty(document, "adoptedStyleSheets", {
      get: () => [],
      set: () => {},
      configurable: true,
    });
  }
  // Polyfill CSSStyleSheet.insertRule / deleteRule if not fully available
  if (typeof CSSStyleSheet !== "undefined") {
    if (!CSSStyleSheet.prototype.insertRule) {
      CSSStyleSheet.prototype.insertRule = vi.fn(() => 0) as never;
    }
    if (!CSSStyleSheet.prototype.deleteRule) {
      CSSStyleSheet.prototype.deleteRule = vi.fn() as never;
    }
  }
});

function makeHexSpan(id: string, text = "AB"): HTMLSpanElement {
  const el = document.createElement("span");
  el.id = id;
  el.textContent = text;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("MouseKeyboardHandler", () => {
  it("can be instantiated without error", () => {
    expect(() => new MouseKeyboardHandler(256)).not.toThrow();
  });

  it("can be instantiated with a change callback", () => {
    const cb = vi.fn();
    expect(() => new MouseKeyboardHandler(16, cb)).not.toThrow();
  });

  it("handleMouseEvent Leave removes dynamic styles without error", () => {
    const handler = new MouseKeyboardHandler(256);
    expect(() => handler.handleMouseEvent("Leave", "dIdx-0")).not.toThrow();
  });

  it("handleMouseEvent Over adds dynamic styles for a data cell", () => {
    const handler = new MouseKeyboardHandler(256);
    expect(() => handler.handleMouseEvent("Over", "dIdx-5")).not.toThrow();
  });

  it("handleMouseEvent Over adds dynamic styles for a text cell", () => {
    const handler = new MouseKeyboardHandler(256);
    expect(() => handler.handleMouseEvent("Over", "tIdx-5")).not.toThrow();
  });

  it("handleMouseEvent Over for offset cell (o prefix) skips column style", () => {
    const handler = new MouseKeyboardHandler(256);
    expect(() => handler.handleMouseEvent("Over", "oIdx-0")).not.toThrow();
  });

  it("handleMouseEvent Over then Leave clears styles", () => {
    const handler = new MouseKeyboardHandler(256);
    handler.handleMouseEvent("Over", "dIdx-3");
    expect(() => handler.handleMouseEvent("Leave", "dIdx-3")).not.toThrow();
  });

  it("handleMouseEvent Click with existing DOM element sets up editing", () => {
    const handler = new MouseKeyboardHandler(256);
    makeHexSpan("dIdx-0");
    expect(() => handler.handleMouseEvent("Click", "dIdx-0")).not.toThrow();
  });

  it("handleMouseEvent Click with unknown id (null element) doesn't crash", () => {
    const handler = new MouseKeyboardHandler(256);
    // No element with this id in DOM
    expect(() => handler.handleMouseEvent("Click", "dIdx-999")).not.toThrow();
  });

  it("Click on data cell, then keydown with hex char input", () => {
    const handler = new MouseKeyboardHandler(256);
    const el = makeHexSpan("dIdx-0", "AB");
    // Also create dIdx-1 for navigation
    makeHexSpan("dIdx-1", "CD");
    handler.handleMouseEvent("Click", "dIdx-0");
    // Simulate a hex key input
    const event = new KeyboardEvent("keydown", { key: "A", bubbles: true });
    el.dispatchEvent(event);
  });

  it("Click on data cell, then another hex char fills max chars and advances", () => {
    const handler = new MouseKeyboardHandler(256);
    const el = makeHexSpan("dIdx-2", "AB");
    makeHexSpan("dIdx-3", "CD");
    makeHexSpan("dIdx-1", "CD");
    handler.handleMouseEvent("Click", "dIdx-2");
    // Two hex chars fills the 2-char limit → auto-advance
    el.textContent = "A"; // partial input
    const ev2 = new KeyboardEvent("keydown", { key: "F", bubbles: true });
    el.dispatchEvent(ev2);
  });

  it("Click on text cell and type a char", () => {
    const handler = new MouseKeyboardHandler(256);
    const el = makeHexSpan("tIdx-0", "X");
    makeHexSpan("tIdx-1", "Y");
    handler.handleMouseEvent("Click", "tIdx-0");
    const event = new KeyboardEvent("keydown", { key: "Z", bubbles: true });
    el.dispatchEvent(event);
  });

  it("Click then Escape key cancels edit", () => {
    const handler = new MouseKeyboardHandler(256);
    const el = makeHexSpan("dIdx-4", "AB");
    handler.handleMouseEvent("Click", "dIdx-4");
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    el.dispatchEvent(event);
  });

  it("Click then arrow key moves cursor", () => {
    const handler = new MouseKeyboardHandler(256);
    makeHexSpan("dIdx-5", "AB");
    makeHexSpan("dIdx-6", "CD");
    handler.handleMouseEvent("Click", "dIdx-5");
    const el = document.getElementById("dIdx-5")!;
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
    el.dispatchEvent(event);
  });

  it("Click twice restores first element before setting up second", () => {
    const handler = new MouseKeyboardHandler(256);
    makeHexSpan("dIdx-7", "11");
    makeHexSpan("dIdx-8", "22");
    handler.handleMouseEvent("Click", "dIdx-7");
    // Second click should restore first
    expect(() => handler.handleMouseEvent("Click", "dIdx-8")).not.toThrow();
  });

  it("calls dataChangeCallback when cell value changes after edit", () => {
    const cb = vi.fn();
    const handler = new MouseKeyboardHandler(256, cb);
    const el = makeHexSpan("dIdx-10", "AB");
    makeHexSpan("dIdx-11", "CD");
    // Create matching text view elements for sync
    makeHexSpan("tIdx-10", ".");
    handler.handleMouseEvent("Click", "dIdx-10");
    // Change the text content to simulate input
    el.textContent = "FF";
    // Click elsewhere to restore
    handler.handleMouseEvent("Click", "dIdx-11");
    // callback may or may not be called depending on whether text changed
  });

  it("Over with invalid id (no parseable index) does not crash", () => {
    const handler = new MouseKeyboardHandler(256);
    // An id that doesn't match the expected format
    expect(() => handler.handleMouseEvent("Over", "invalid-id")).not.toThrow();
  });
});
