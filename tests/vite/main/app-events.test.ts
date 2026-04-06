/**
 * app-events.test module.
 *
 * @remarks
 * Source module for app-events.test.
 */

/**
 * @file app-events.test.ts
 * @description Source module for app-events.test.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/common/ipc-contracts";
import { registerAppEvents } from "../../../src/main/app-events";
import { createEventEmitterHarness } from "../../helpers/event-emitter-test-harness";
import { createMockBrowserWindow } from "../../helpers/ipc-test-harness";

describe("registerAppEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends theme-changed render notification when app resigns active", () => {
    const appInstance = createEventEmitterHarness();
    const nativeTheme = createEventEmitterHarness();
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn().mockReturnValue(false),
    } as never);

    registerAppEvents(appInstance as never, nativeTheme as never, () => mainWindow as never);

    appInstance.emit("did-resign-active");

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.render,
      {
        command: "theme-changed",
        data: nativeTheme,
      },
    );
  });

  it("quits the app when all windows are closed outside macOS", () => {
    const appInstance = {
      ...createEventEmitterHarness(),
      quit: vi.fn(),
    };
    const nativeTheme = createEventEmitterHarness();

    const platformSpy = vi.spyOn(process, "platform", "get").mockReturnValue("win32");

    registerAppEvents(appInstance as never, nativeTheme as never, () => undefined);

    appInstance.emit("window-all-closed");

    expect(appInstance.quit).toHaveBeenCalledTimes(1);
    platformSpy.mockRestore();
  });

  it("sends native theme updates to the dedicated theme channel", () => {
    const appInstance = createEventEmitterHarness();
    const nativeTheme = {
      ...createEventEmitterHarness(),
      shouldUseDarkColors: true,
    };
    const mainWindow = createMockBrowserWindow({
      isDestroyed: vi.fn().mockReturnValue(false),
    } as never);

    registerAppEvents(appInstance as never, nativeTheme as never, () => mainWindow as never);

    nativeTheme.emit("updated");

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.mainToRenderer.notifications.themeChanged,
      { shouldUseDarkColors: true },
    );
  });
});
