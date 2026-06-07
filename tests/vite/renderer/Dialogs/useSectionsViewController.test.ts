/**
 * Implements useSectionsViewController.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { gdbSymbolFiles } from "../../../../src/common/gdb-state-types";
import { useSectionsViewController } from "../../../../src/renderer/Dialogs/useSectionsViewController";

const SAMPLE_DATA: gdbSymbolFiles = {
  mainSym: "hello",
  sections: [{ startAddr: "0x1000", endAddr: "0x2000", section: ".text", file: "main.c" }],
};
/**
 * Performs setWindowIpc as part of this module's internal workflow.
 *
 * @param overrides - overrides parameter.
 * @param unknown> - unknown> parameter.
 * @returns The computed result produced by this operation.
 */

function setWindowIpc(overrides: Record<string, unknown>): void {
  Object.defineProperty(window, "ipcToMain", {
    configurable: true,
    writable: true,
    value: overrides,
  });
}

describe("useSectionsViewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with default state", () => {
    setWindowIpc({});
    const { result } = renderHook(() => useSectionsViewController());
    expect(result.current.visible).toBe(false);
    expect(result.current.symbolFiles).toBeNull();
    expect(result.current.options).toEqual({ showEmptySpace: false, showLegend: false });
    expect(typeof result.current.showDialog).toBe("function");
    expect(typeof result.current.hideDialog).toBe("function");
    expect(typeof result.current.onOptionsChange).toBe("function");
  });

  it("showDialog fetches data and settings, then sets visible=true with settings options", async () => {
    const getSectionData = vi.fn().mockResolvedValue(SAMPLE_DATA);
    const getSettings = vi.fn().mockResolvedValue({
      gui: { sectionsView: { showEmptySpace: true, showLegend: true } },
    });

    setWindowIpc({
      queries: { debugger: { getSectionData }, app: { getSettings } },
      commands: { app: { notifyMain: vi.fn() } },
    });

    const { result } = renderHook(() => useSectionsViewController());

    act(() => {
      result.current.showDialog();
    });

    await waitFor(() => {
      expect(result.current.visible).toBe(true);
    });

    expect(result.current.symbolFiles).toEqual(SAMPLE_DATA);
    expect(result.current.options).toEqual({ showEmptySpace: true, showLegend: true });
  });

  it("showDialog uses default options when sectionsView is absent from settings", async () => {
    setWindowIpc({
      queries: {
        debugger: { getSectionData: vi.fn().mockResolvedValue(SAMPLE_DATA) },
        app: { getSettings: vi.fn().mockResolvedValue({ gui: {} }) },
      },
      commands: { app: { notifyMain: vi.fn() } },
    });

    const { result } = renderHook(() => useSectionsViewController());

    act(() => {
      result.current.showDialog();
    });

    await waitFor(() => expect(result.current.visible).toBe(true));
    expect(result.current.options).toEqual({ showEmptySpace: false, showLegend: false });
  });

  it("showDialog uses partial sectionsView options with ?? fallback for missing fields", async () => {
    setWindowIpc({
      queries: {
        debugger: { getSectionData: vi.fn().mockResolvedValue(SAMPLE_DATA) },
        app: {
          getSettings: vi.fn().mockResolvedValue({
            gui: { sectionsView: { showEmptySpace: true } },
          }),
        },
      },
      commands: { app: { notifyMain: vi.fn() } },
    });

    const { result } = renderHook(() => useSectionsViewController());

    act(() => {
      result.current.showDialog();
    });

    await waitFor(() => expect(result.current.visible).toBe(true));
    expect(result.current.options).toEqual({ showEmptySpace: true, showLegend: false });
  });

  it("hideDialog sets visible to false", async () => {
    setWindowIpc({
      queries: {
        debugger: { getSectionData: vi.fn().mockResolvedValue(SAMPLE_DATA) },
        app: { getSettings: vi.fn().mockResolvedValue({ gui: {} }) },
      },
      commands: { app: { notifyMain: vi.fn() } },
    });

    const { result } = renderHook(() => useSectionsViewController());

    act(() => {
      result.current.showDialog();
    });

    await waitFor(() => expect(result.current.visible).toBe(true));

    act(() => {
      result.current.hideDialog();
    });

    expect(result.current.visible).toBe(false);
  });

  it("onOptionsChange updates options and sends notification to main", () => {
    const notifyMain = vi.fn().mockResolvedValue(undefined);
    setWindowIpc({
      queries: {
        debugger: { getSectionData: vi.fn() },
        app: { getSettings: vi.fn() },
      },
      commands: { app: { notifyMain } },
    });

    const { result } = renderHook(() => useSectionsViewController());

    const newOpts = { showEmptySpace: true, showLegend: true };
    act(() => {
      result.current.onOptionsChange(newOpts);
    });

    expect(result.current.options).toEqual(newOpts);
    expect(notifyMain).toHaveBeenCalledWith({
      command: "save-sections-view-options",
      data: newOpts,
    });
  });
});
