// @vitest-environment jsdom

/**
 * Stress benchmarks for the GdbCommandWindow output console.
 *
 * Each bench body appends N messages then clears the output div — this keeps
 * DOM size constant across bench iterations so timing is comparable at every
 * scale.  The "clear window" describe isolates the innerHTML-reset cost at
 * high node counts by using a different message ratio.
 *
 * Setup: the real useGdbCommandController hook is mounted via renderHook so
 * the actual appendGdbMessage / appendGdbHtmlMessage code paths execute; only
 * the IPC wiring is replaced with lightweight capture stubs.
 */

import { act, renderHook } from "@testing-library/react";
import { beforeAll, bench, describe } from "vitest";
import { useGdbCommandController } from "../../src/renderer/ToolWindows/useGdbCommandController";

// ─── Shared state populated once in beforeAll ─────────────────────────────────

type TextCb = (text: string) => void;

let fireConsole: TextCb;
let fireLog: TextCb;
let fireError: TextCb;
let fireDebug: TextCb;
let fireHtml: (html: string) => void;
let outputEl: HTMLDivElement;
let hookOutputRef: { current: HTMLDivElement | null };

// Pre-declared at module level so the top-level beforeAll can populate them
// before the for-loop describes are evaluated. Vitest bench silently skips
// nested beforeAll hooks when describe() is called inside a for loop, so all
// slowdown setup must happen in the single top-level beforeAll instead.
const SLOWDOWN_SIZES = [0, 500, 2000, 5000, 10000] as const;
const slowdownDivs = new Map<number, HTMLDivElement>();

beforeAll(async () => {
  // jsdom does not implement scrollIntoView — polyfill to avoid TypeError
  Element.prototype.scrollIntoView = () => {};

  let capConsole: TextCb = () => {};
  let capLog: TextCb = () => {};
  let capError: TextCb = () => {};
  let capDebug: TextCb = () => {};
  let capHtml: (h: string) => void = () => {};

  Object.defineProperty(window, "ipcToMain", {
    value: {
      queries: {
        app: { getSettings: () => Promise.resolve({}) },
      },
      notifications: { render: () => () => {} },
      messages: {
        console: (cb: TextCb) => { capConsole = cb; return () => {}; },
        log:     (cb: TextCb) => { capLog     = cb; return () => {}; },
        error:   (cb: TextCb) => { capError   = cb; return () => {}; },
        debug:   (cb: TextCb) => { capDebug   = cb; return () => {}; },
        html:    (cb: (h: string) => void) => { capHtml = cb; return () => {}; },
      },
      commands: {
        debugger: {
          sendGdbCommand: () => Promise.resolve(),
          respondToDangerousCommand: () => {},
        },
        app: { notifyMain: () => {} },
      },
    },
    configurable: true,
    writable: true,
  });

  const { result } = renderHook(() => useGdbCommandController());
  await act(async () => {});

  // Wire a detached div as the output area so DOM mutations are real but
  // don't interact with any live document layout.
  outputEl = document.createElement("div");
  hookOutputRef = result.current.outputRef as { current: HTMLDivElement | null };
  hookOutputRef.current = outputEl;

  // Pre-fill one div per slowdown DOM size so the bench bodies can redirect
  // hookOutputRef.current without needing a nested beforeAll (which Vitest
  // bench silently skips when the describe is generated inside a for loop).
  for (const preSize of SLOWDOWN_SIZES) {
    const el = document.createElement("div");
    hookOutputRef.current = el;
    for (let i = 0; i < preSize; i++) capConsole(`~"pre ${i}\n"`);
    slowdownDivs.set(preSize, el);
  }
  hookOutputRef.current = outputEl; // restore for the standard benches

  fireConsole = capConsole;
  fireLog     = capLog;
  fireError   = capError;
  fireDebug   = capDebug;
  fireHtml    = capHtml;
});

// ─── Representative message content ──────────────────────────────────────────

// A small register-dump table — the most common HTML payload from GeneralInfoSender.
const HTML_TABLE =
  "<table><tbody>" +
  "<tr><td>r0</td><td>0x00000000</td></tr>" +
  "<tr><td>r1</td><td>0xdeadbeef</td></tr>" +
  "<tr><td>pc</td><td>0x08001234</td></tr>" +
  "</tbody></table>";

// ─── Console output ───────────────────────────────────────────────────────────

describe("GdbCommandWindow — console output", () => {
  bench("×100", () => {
    for (let i = 0; i < 100; i++)
      fireConsole(`~"0x${(0x08001000 + i * 4).toString(16)} in fn_${i}() at src.c:${i}\n"`);
    outputEl.innerHTML = "";
  });

  bench("×1000", () => {
    for (let i = 0; i < 1000; i++)
      fireConsole(`~"0x${(0x08001000 + i * 4).toString(16)} in fn_${i}() at src.c:${i}\n"`);
    outputEl.innerHTML = "";
  });

  bench("×10000", () => {
    for (let i = 0; i < 10000; i++)
      fireConsole(`~"0x${(0x08001000 + i * 4).toString(16)} in fn_${i}() at src.c:${i}\n"`);
    outputEl.innerHTML = "";
  });
});

// ─── Log output ───────────────────────────────────────────────────────────────

describe("GdbCommandWindow — log output", () => {
  bench("×100", () => {
    for (let i = 0; i < 100; i++)
      fireLog(`&"reading symbols from /usr/lib/debug/libmod_${i}.so...\n"`);
    outputEl.innerHTML = "";
  });

  bench("×1000", () => {
    for (let i = 0; i < 1000; i++)
      fireLog(`&"reading symbols from /usr/lib/debug/libmod_${i}.so...\n"`);
    outputEl.innerHTML = "";
  });

  bench("×10000", () => {
    for (let i = 0; i < 10000; i++)
      fireLog(`&"reading symbols from /usr/lib/debug/libmod_${i}.so...\n"`);
    outputEl.innerHTML = "";
  });
});

// ─── Error output ─────────────────────────────────────────────────────────────

describe("GdbCommandWindow — error output", () => {
  bench("×100", () => {
    for (let i = 0; i < 100; i++)
      fireError(`&"warning: no debug symbols found for module_${i}\n"`);
    outputEl.innerHTML = "";
  });

  bench("×1000", () => {
    for (let i = 0; i < 1000; i++)
      fireError(`&"warning: no debug symbols found for module_${i}\n"`);
    outputEl.innerHTML = "";
  });

  bench("×10000", () => {
    for (let i = 0; i < 10000; i++)
      fireError(`&"warning: no debug symbols found for module_${i}\n"`);
    outputEl.innerHTML = "";
  });
});

// ─── Debug output ─────────────────────────────────────────────────────────────

describe("GdbCommandWindow — debug output", () => {
  bench("×100", () => {
    for (let i = 0; i < 100; i++)
      fireDebug(`[target::read_memory] addr=0x${(0x20000000 + i * 4).toString(16)} len=4`);
    outputEl.innerHTML = "";
  });

  bench("×1000", () => {
    for (let i = 0; i < 1000; i++)
      fireDebug(`[target::read_memory] addr=0x${(0x20000000 + i * 4).toString(16)} len=4`);
    outputEl.innerHTML = "";
  });

  bench("×10000", () => {
    for (let i = 0; i < 10000; i++)
      fireDebug(`[target::read_memory] addr=0x${(0x20000000 + i * 4).toString(16)} len=4`);
    outputEl.innerHTML = "";
  });
});

// ─── HTML output ──────────────────────────────────────────────────────────────

describe("GdbCommandWindow — HTML output", () => {
  bench("×100", () => {
    for (let i = 0; i < 100; i++) fireHtml(HTML_TABLE);
    outputEl.innerHTML = "";
  });

  bench("×1000", () => {
    for (let i = 0; i < 1000; i++) fireHtml(HTML_TABLE);
    outputEl.innerHTML = "";
  });

  bench("×10000", () => {
    for (let i = 0; i < 10000; i++) fireHtml(HTML_TABLE);
    outputEl.innerHTML = "";
  });
});

// ─── Mixed (all 5 types interleaved) ─────────────────────────────────────────

describe("GdbCommandWindow — mixed all types", () => {
  bench("×100 per type (500 msgs)", () => {
    for (let i = 0; i < 100; i++) {
      fireConsole(`~"step ${i}\n"`);
      fireLog(`&"log ${i}\n"`);
      fireError(`&"warn ${i}\n"`);
      fireDebug(`dbg ${i}`);
      fireHtml(`<div>${i}</div>`);
    }
    outputEl.innerHTML = "";
  });

  bench("×1000 per type (5000 msgs)", () => {
    for (let i = 0; i < 1000; i++) {
      fireConsole(`~"step ${i}\n"`);
      fireLog(`&"log ${i}\n"`);
      fireError(`&"warn ${i}\n"`);
      fireDebug(`dbg ${i}`);
      fireHtml(`<div>${i}</div>`);
    }
    outputEl.innerHTML = "";
  });

  bench("×10000 per type (50000 msgs)", () => {
    for (let i = 0; i < 10000; i++) {
      fireConsole(`~"step ${i}\n"`);
      fireLog(`&"log ${i}\n"`);
      fireError(`&"warn ${i}\n"`);
      fireDebug(`dbg ${i}`);
      fireHtml(`<div>${i}</div>`);
    }
    outputEl.innerHTML = "";
  });
});

// ─── Clear window ─────────────────────────────────────────────────────────────
//
// Each iteration fills the output with N mixed messages then clears it.
// The innerHTML = "" is the operation under scrutiny here; the fill is the
// mandatory setup cost that cannot be moved outside the timed region without
// per-iteration hooks (not available in Vitest bench).

describe("GdbCommandWindow — clear window", () => {
  bench("clear after 1000 mixed messages", () => {
    for (let i = 0; i < 200; i++) {
      fireConsole(`~"line ${i}\n"`);
      fireLog(`&"log ${i}\n"`);
      fireError(`&"err ${i}\n"`);
      fireDebug(`dbg ${i}`);
      fireHtml(`<div>${i}</div>`);
    }
    outputEl.innerHTML = "";
  });

  bench("clear after 10000 mixed messages", () => {
    for (let i = 0; i < 2000; i++) {
      fireConsole(`~"line ${i}\n"`);
      fireLog(`&"log ${i}\n"`);
      fireError(`&"err ${i}\n"`);
      fireDebug(`dbg ${i}`);
      fireHtml(`<div>${i}</div>`);
    }
    outputEl.innerHTML = "";
  });
});

// ─── DOM-size slowdown ────────────────────────────────────────────────────────
//
// Each describe uses a div pre-filled with N messages (created in the top-level
// beforeAll). Each bench body redirects hookOutputRef.current to that div,
// appends ×100 messages, then removes only the nodes it added — keeping the
// pre-filled DOM depth constant across iterations.
//
// bench-report.cjs detects suites named "GdbCommandWindow — append at dom:N"
// and plots a multi-line latency-vs-DOM-size chart from the mean values.

for (const preSize of SLOWDOWN_SIZES) {
  describe(`GdbCommandWindow — append at dom:${preSize}`, () => {
    bench("console ×100", () => {
      const el = slowdownDivs.get(preSize)!;
      hookOutputRef.current = el;
      const n0 = el.childNodes.length;
      for (let i = 0; i < 100; i++) fireConsole(`~"msg ${i}\n"`);
      while (el.childNodes.length > n0) el.removeChild(el.lastChild!);
    });

    bench("log ×100", () => {
      const el = slowdownDivs.get(preSize)!;
      hookOutputRef.current = el;
      const n0 = el.childNodes.length;
      for (let i = 0; i < 100; i++) fireLog(`&"msg ${i}\n"`);
      while (el.childNodes.length > n0) el.removeChild(el.lastChild!);
    });

    bench("error ×100", () => {
      const el = slowdownDivs.get(preSize)!;
      hookOutputRef.current = el;
      const n0 = el.childNodes.length;
      for (let i = 0; i < 100; i++) fireError(`&"msg ${i}\n"`);
      while (el.childNodes.length > n0) el.removeChild(el.lastChild!);
    });

    bench("debug ×100", () => {
      const el = slowdownDivs.get(preSize)!;
      hookOutputRef.current = el;
      const n0 = el.childNodes.length;
      for (let i = 0; i < 100; i++) fireDebug(`msg ${i}`);
      while (el.childNodes.length > n0) el.removeChild(el.lastChild!);
    });

    bench("html ×100", () => {
      const el = slowdownDivs.get(preSize)!;
      hookOutputRef.current = el;
      const n0 = el.childNodes.length;
      for (let i = 0; i < 100; i++) fireHtml(`<div>${i}</div>`);
      while (el.childNodes.length > n0) el.removeChild(el.lastChild!);
    });
  });
}
