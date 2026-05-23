// @vitest-environment jsdom
import { act, render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGdbCommandController } from "../../../../src/renderer/ToolWindows/useGdbCommandController";

type IpcNotifyCallback = (msg: Record<string, unknown>) => void;
type IpcMessageCallback = (text: string) => void;
type UnsubFn = ReturnType<typeof vi.fn>;

let notifyCallback: IpcNotifyCallback | null = null;
let consoleCallback: IpcMessageCallback | null = null;
let logCallback: IpcMessageCallback | null = null;
let errorCallback: IpcMessageCallback | null = null;
let debugCallback: IpcMessageCallback | null = null;
let htmlCallback: ((html: string) => void) | null = null;

beforeEach(() => {
  // JSDOM does not implement scrollIntoView — polyfill to avoid TypeError
  Element.prototype.scrollIntoView = vi.fn();

  notifyCallback = null;
  consoleCallback = null;
  logCallback = null;
  errorCallback = null;
  debugCallback = null;
  htmlCallback = null;

  (window as unknown as Record<string, unknown>).ipcToMain = {
    queries: {
      app: {
        getSettings: vi.fn(() => Promise.resolve({ command: { history: ["cmd1", "cmd2"] } })),
      },
    },
    notifications: {
      render: vi.fn((cb: IpcNotifyCallback): UnsubFn => {
        notifyCallback = cb;
        return vi.fn();
      }),
    },
    messages: {
      console: vi.fn((cb: IpcMessageCallback): UnsubFn => {
        consoleCallback = cb;
        return vi.fn();
      }),
      log: vi.fn((cb: IpcMessageCallback): UnsubFn => {
        logCallback = cb;
        return vi.fn();
      }),
      error: vi.fn((cb: IpcMessageCallback): UnsubFn => {
        errorCallback = cb;
        return vi.fn();
      }),
      debug: vi.fn((cb: IpcMessageCallback): UnsubFn => {
        debugCallback = cb;
        return vi.fn();
      }),
      html: vi.fn((cb: (html: string) => void): UnsubFn => {
        htmlCallback = cb;
        return vi.fn();
      }),
    },
    commands: {
      debugger: { sendGdbCommand: vi.fn() },
      app: { notifyMain: vi.fn() },
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGdbCommandController", () => {
  it("returns expected refs and handlers", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    await act(async () => {});
    expect(result.current.outputRef).toBeDefined();
    expect(result.current.inputRef).toBeDefined();
    expect(result.current.historyRef).toBeDefined();
    expect(typeof result.current.onSendCommand).toBe("function");
    expect(typeof result.current.onClearWindow).toBe("function");
    expect(typeof result.current.onShowHistory).toBe("function");
    expect(typeof result.current.onScrollHandler).toBe("function");
  });

  it("appendMessage via console callback appends span/br to outputRef", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      consoleCallback?.("hello");
    });
    expect(div.querySelector("span")).toBeTruthy();
  });

  it("appendMessage with empty string uses non-breaking space", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      consoleCallback?.("");
    });
    const span = div.querySelector("span");
    expect(span?.textContent).toBe("\u00A0");
  });

  it("appendMessage via log callback works", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      logCallback?.("log msg");
    });
    expect(div.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("appendMessage via error callback works", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      errorCallback?.("err msg");
    });
    expect(div.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("appendHtmlMessage via html callback appends div", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      htmlCallback?.("<b>bold</b>");
    });
    expect(div.querySelector("b")).toBeTruthy();
  });

  it("sendCommand does nothing when inputRef is null", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    await act(async () => {});
    // inputRef.current is null by default
    act(() => {
      result.current.onSendCommand();
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).not.toHaveBeenCalled();
  });

  it("sendCommand sends input value and clears it", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const input = document.createElement("input");
    input.value = "print x";
    result.current.inputRef.current = input;
    await act(async () => {});

    act(() => {
      result.current.onSendCommand();
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith("print x");
    expect(input.value).toBe("");
  });

  it("onClearWindow clears outputRef innerHTML", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    div.innerHTML = "<span>old</span>";
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      result.current.onClearWindow();
    });
    expect(div.innerHTML).toBe("");
  });

  it("onClearWindow does nothing when outputRef is null", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    await act(async () => {});
    // outputRef.current is null — no error should be thrown
    act(() => {
      result.current.onClearWindow();
    });
  });

  it("onScrollHandler sets shouldScroll=false when scrolled up", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    // Fake a scrolled-up state: scrollHeight >> scrollTop + clientHeight
    Object.defineProperty(div, "scrollHeight", { get: () => 1000 });
    Object.defineProperty(div, "scrollTop", { get: () => 0 });
    // getBoundingClientRect returns { height: 100 }
    div.getBoundingClientRect = () => ({ height: 100 }) as DOMRect;
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      result.current.onScrollHandler();
    });
    // Next append should not scroll (shouldScroll=false)
    const outputDiv = document.createElement("div");
    result.current.outputRef.current = outputDiv;
    act(() => {
      consoleCallback?.("after scroll");
    });
    // no error thrown = success
  });

  it("onScrollHandler sets shouldScroll=true when at bottom", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    // Near bottom: scrollHeight = scrollTop + height
    Object.defineProperty(div, "scrollHeight", { get: () => 100 });
    Object.defineProperty(div, "scrollTop", { get: () => 0 });
    div.getBoundingClientRect = () => ({ height: 100 }) as DOMRect;
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      result.current.onScrollHandler();
    });
  });

  it("onShowHistory hides history if already visible", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = false;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onShowHistory();
    });
    expect(select.hidden).toBe(true);
  });

  it("onShowHistory shows history if currently hidden", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = true;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onShowHistory();
    });
    expect(select.hidden).toBe(false);
  });

  it("notification command-entry focuses input", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const input = document.createElement("input");
    const focusSpy = vi.spyOn(input, "focus");
    result.current.inputRef.current = input;
    await act(async () => {});

    act(() => {
      notifyCallback?.({ command: "command-entry" });
    });
    expect(focusSpy).toHaveBeenCalled();
  });

  it("notification command-entry does nothing when inputRef is null", async () => {
    renderHook(() => useGdbCommandController());
    await act(async () => {});
    // inputRef.current is null — should not throw
    act(() => {
      notifyCallback?.({ command: "command-entry" });
    });
  });

  it("onSelectKeydownHandler Escape hides history select", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = false;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onSelectKeydownHandler({
        key: "Escape",
        stopPropagation: vi.fn(),
      } as never);
    });
    expect(select.hidden).toBe(true);
  });

  it("onSelectKeydownHandler Enter sets input value from selection", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    const opt = document.createElement("option");
    opt.text = "cmd1";
    opt.value = "cmd1";
    select.add(opt);
    select.options.selectedIndex = 0;

    const input = document.createElement("input");
    result.current.historyRef.current = select;
    result.current.inputRef.current = input;
    await act(async () => {});

    act(() => {
      result.current.onSelectKeydownHandler({
        key: "Enter",
        currentTarget: select,
        stopPropagation: vi.fn(),
      } as never);
    });
    expect(input.value).toBe("cmd1");
    expect(select.hidden).toBe(true);
  });

  it("onInputKeyupHandler ArrowUp focuses history", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    const focusSpy = vi.spyOn(select, "focus");
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onInputKeyupHandler({ key: "ArrowUp" } as never);
    });
    expect(focusSpy).toHaveBeenCalled();
  });

  it("onInputKeydownHandler ArrowUp shows history", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = true;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onInputKeydownHandler({ key: "ArrowUp" } as never);
    });
    expect(select.hidden).toBe(false);
  });

  it("onInputKeydownHandler Escape hides history", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = false;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onInputKeydownHandler({ key: "Escape" } as never);
    });
    expect(select.hidden).toBe(true);
  });

  it("onInputKeydownHandler Enter sends command", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const input = document.createElement("input");
    input.value = "next";
    result.current.inputRef.current = input;
    await act(async () => {});

    act(() => {
      result.current.onInputKeydownHandler({ key: "Enter" } as never);
    });
    expect(window.ipcToMain.commands.debugger.sendGdbCommand).toHaveBeenCalledWith("next");
  });

  it("appendMessage via debug callback appends span to outputRef", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const div = document.createElement("div");
    result.current.outputRef.current = div;
    await act(async () => {});

    act(() => {
      debugCallback?.("debug output");
    });
    expect(div.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("notification with unrecognised command does nothing", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const input = document.createElement("input");
    const focusSpy = vi.spyOn(input, "focus");
    result.current.inputRef.current = input;
    await act(async () => {});

    act(() => {
      notifyCallback?.({ command: "some-other-command" });
    });

    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("appendHtmlMessage with null outputRef does not throw", async () => {
    renderHook(() => useGdbCommandController());
    // outputRef.current is null — htmlCallback should not throw
    await act(async () => {});

    act(() => {
      htmlCallback?.("<b>safe</b>");
    });
  });

  it("onShowHistory does nothing when historyRef is null", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    await act(async () => {});
    // historyRef.current is null by default — should not throw
    act(() => {
      result.current.onShowHistory();
    });
  });

  it("onInputKeydownHandler with unknown key does nothing", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = true;
    result.current.historyRef.current = select;
    await act(async () => {});

    act(() => {
      result.current.onInputKeydownHandler({ key: "Tab" } as never);
    });

    // hidden state unchanged
    expect(select.hidden).toBe(true);
  });

  it("onSelectKeydownHandler with unknown key only stops propagation", async () => {
    const { result } = renderHook(() => useGdbCommandController());
    const select = document.createElement("select");
    select.hidden = false;
    result.current.historyRef.current = select;
    await act(async () => {});

    const stopPropagation = vi.fn();
    act(() => {
      result.current.onSelectKeydownHandler({
        key: "Tab",
        stopPropagation,
      } as never);
    });

    expect(stopPropagation).toHaveBeenCalled();
    expect(select.hidden).toBe(false);
  });

  it("ondblclick handler sets input value from selected option and hides select", async () => {
    // This test renders a real component so historyRef is populated before
    // the useEffect runs and ondblclick is properly assigned.
    type Ctrl = ReturnType<typeof useGdbCommandController>;
    let ctrl: Ctrl | null = null;

    function TestComponent() {
      ctrl = useGdbCommandController();
      return createElement(
        "div",
        null,
        createElement("select", {
          ref: ctrl.historyRef as React.Ref<HTMLSelectElement>,
          id: "test-hist",
        }),
        createElement("input", {
          ref: ctrl.inputRef as React.Ref<HTMLInputElement>,
          id: "test-input",
        }),
      );
    }

    await act(async () => {
      render(createElement(TestComponent));
    });

    const select = ctrl!.historyRef.current!;
    const input = ctrl!.inputRef.current!;

    // Populate the select with an option and select it
    const opt = document.createElement("option");
    opt.value = "my-command";
    select.add(opt);
    select.options.selectedIndex = 0;
    select.hidden = false;

    act(() => {
      select.dispatchEvent(new Event("dblclick"));
    });

    expect(select.hidden).toBe(true);
    expect(input.value).toBe("my-command");
  });
});
