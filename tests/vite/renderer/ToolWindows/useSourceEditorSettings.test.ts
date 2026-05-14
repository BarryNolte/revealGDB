// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../src/renderer/ToolWindows/GdbSourceEditorConfig", () => ({
  defaultTheme: "gruvbox",
  editorThemes: new Map([
    ["Gruvbox", "gruvbox"],
    ["Dracula", "dracula"],
  ]),
}));

import { useSourceEditorSettings } from "../../../../src/renderer/ToolWindows/useSourceEditorSettings";

type QueryWindow = Window & {
  ipcToMain: {
    queries: {
      app: { getSettings: ReturnType<typeof vi.fn> };
    };
  };
};

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    gui: {
      sourceViewerTheme: undefined,
      sourceViewerFontSize: undefined,
      sourceViewerFontName: undefined,
      ...overrides,
    },
  };
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).ipcToMain = {
    queries: {
      app: { getSettings: vi.fn(() => Promise.resolve(makeSettings())) },
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSourceEditorSettings", () => {
  it("returns default settings before getSettings resolves", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    expect(result.current.theme).toBe("gruvbox");
    expect(result.current.fontSize).toBe(14);
    expect(result.current.lineHeight).toBe(15);
    expect(result.current.fontName).toBe("monospace");
  });

  it("applies theme from getSettings when it is a known theme key", async () => {
    (window as unknown as QueryWindow).ipcToMain.queries.app.getSettings.mockResolvedValue(
      makeSettings({ sourceViewerTheme: "Dracula" }),
    );
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {});
    expect(result.current.theme).toBe("dracula");
  });

  it("falls back to defaultTheme when getSettings returns an unknown theme key", async () => {
    (window as unknown as QueryWindow).ipcToMain.queries.app.getSettings.mockResolvedValue(
      makeSettings({ sourceViewerTheme: "NotInMap" }),
    );
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {});
    expect(result.current.theme).toBe("gruvbox");
  });

  it("applies fontSize and lineHeight from getSettings", async () => {
    (window as unknown as QueryWindow).ipcToMain.queries.app.getSettings.mockResolvedValue(
      makeSettings({ sourceViewerFontSize: "16" }),
    );
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {});
    expect(result.current.fontSize).toBe(16);
    expect(result.current.lineHeight).toBe(17);
  });

  it("applies fontName from getSettings", async () => {
    (window as unknown as QueryWindow).ipcToMain.queries.app.getSettings.mockResolvedValue(
      makeSettings({ sourceViewerFontName: "Courier" }),
    );
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {});
    expect(result.current.fontName).toBe("Courier");
  });

  it("does NOT change settings when getSettings returns empty gui fields", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {});
    expect(result.current.theme).toBe("gruvbox");
    expect(result.current.fontSize).toBe(14);
    expect(result.current.fontName).toBe("monospace");
  });

  it("updates theme via changeEditor event with a known theme", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {
      window.dispatchEvent(new CustomEvent("changeEditor", { detail: { theme: "Gruvbox" } }));
    });
    expect(result.current.theme).toBe("gruvbox");
  });

  it("falls back to defaultTheme via changeEditor event with an unknown theme", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {
      window.dispatchEvent(new CustomEvent("changeEditor", { detail: { theme: "Unknown" } }));
    });
    expect(result.current.theme).toBe("gruvbox");
  });

  it("updates fontSize and lineHeight via changeEditor event", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {
      window.dispatchEvent(new CustomEvent("changeEditor", { detail: { fontSize: 18 } }));
    });
    expect(result.current.fontSize).toBe(18);
    expect(result.current.lineHeight).toBe(19);
  });

  it("updates fontName via changeEditor event", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    await act(async () => {
      window.dispatchEvent(new CustomEvent("changeEditor", { detail: { fontName: "Monaco" } }));
    });
    expect(result.current.fontName).toBe("Monaco");
  });

  it("does NOT update settings when changeEditor event has no relevant detail", async () => {
    const { result } = renderHook(() => useSourceEditorSettings());
    const initialTheme = result.current.theme;
    await act(async () => {
      window.dispatchEvent(new CustomEvent("changeEditor", { detail: {} }));
    });
    expect(result.current.theme).toBe(initialTheme);
  });
});
