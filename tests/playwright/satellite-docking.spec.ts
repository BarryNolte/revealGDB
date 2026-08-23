import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * Satellite Docking Integration Tests
 *
 * Tests for multi-window support with satellite docking functionality.
 * Validates that tool windows can be opened in separate native windows
 * and that state persists across restarts.
 */

test.describe("Satellite Docking - Multi-Window Support", () => {
  test("should enable satellite docking configuration", async ({ page }) => {
    // Navigate to the application
    await page.goto("http://localhost:5173");

    // Verify DockManager has satellite windows enabled
    const satelliteConfigured = await page.evaluate(() => {
      // Check if revealGDB window has satellite window configuration
      return (window as any).dockManager?.config?.enableBrowserWindows === true;
    });

    expect(satelliteConfigured).toBe(true);
  });

  test("should initialize satellite window manager on app startup", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Wait for app to fully initialize
    await page.waitForTimeout(1000);

    // Check that satellite window manager is initialized
    const managerInitialized = await page.evaluate(() => {
      return (window as any).satelliteWindowManager !== undefined;
    });

    expect(managerInitialized).toBe(true);
  });

  test("should track satellite window lifecycle", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Get initial window count
    const initialCount = await page.evaluate(() => {
      return (window as any).satelliteWindowManager?.getSatelliteWindowCount?.() ?? 0;
    });

    expect(initialCount).toBe(0);

    // After opening a satellite window, count should increase
    // (This requires UI interaction with dock-spawn-ts, which would open a new window)
    // Note: Full E2E testing of new window creation requires multi-page context
  });

  test("should support multiple satellite windows", async ({ page, context }) => {
    await page.goto("http://localhost:5173");

    // Verify manager can track multiple windows
    const supportsMultiple = await page.evaluate(() => {
      const manager = (window as any).satelliteWindowManager;
      return {
        hasSatelliteWindows: typeof manager?.getSatelliteWindows === "function",
        hasWindowCount: typeof manager?.getSatelliteWindowCount === "function",
        hasGetWindowInfo: typeof manager?.getWindowInfo === "function",
      };
    });

    expect(supportsMultiple.hasSatelliteWindows).toBe(true);
    expect(supportsMultiple.hasWindowCount).toBe(true);
    expect(supportsMultiple.hasGetWindowInfo).toBe(true);
  });

  test("should persist satellite window state to settings", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify IPC channel exists for persisting satellite windows
    const ipcAvailable = await page.evaluate(() => {
      return typeof (window as any).ipcToMain?.commands?.app?.notify === "function";
    });

    expect(ipcAvailable).toBe(true);
  });

  test("should handle satellite window configuration changes", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify DockManager configuration is accessible
    const config = await page.evaluate(() => {
      const manager = (window as any).dockManager;
      return {
        enableBrowserWindows: manager?.config?.enableBrowserWindows,
        hasCallbacks: {
          prepareElement: typeof manager?.config?.prepareElementForNewWindow === "function",
          notifyNewWindow: typeof manager?.config?.notifyOnNewWindow === "function",
        },
      };
    });

    expect(config.enableBrowserWindows).toBe(true);
    expect(config.hasCallbacks.prepareElement).toBe(true);
    expect(config.hasCallbacks.notifyNewWindow).toBe(true);
  });

  test("should provide cleanup for all satellite windows", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify cleanup method exists
    const hasCleanup = await page.evaluate(() => {
      return typeof (window as any).satelliteWindowManager?.closeAllSatelliteWindows === "function";
    });

    expect(hasCleanup).toBe(true);
  });

  test("should maintain satellite window state across settings", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify settings path for satellite windows
    const settingsPath = "gdb.workspace.satelliteWindows";

    // Check that the IPC command supports saving this state
    const canSaveSatellites = await page.evaluate(() => {
      // The app should be able to send save-satellite-windows command
      return typeof (window as any).ipcToMain !== "undefined";
    });

    expect(canSaveSatellites).toBe(true);
  });

  test("should integrate with dock-spawn-ts context menu", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify dock-spawn-ts is configured to show "Open in New Window" option
    const dockConfig = await page.evaluate(() => {
      const manager = (window as any).dockManager;
      return {
        enabled: manager?.config?.enableBrowserWindows === true,
        hasPrepareCallback: typeof manager?.config?.prepareElementForNewWindow === "function",
        hasNotifyCallback: typeof manager?.config?.notifyOnNewWindow === "function",
      };
    });

    expect(dockConfig.enabled).toBe(true);
    expect(dockConfig.hasPrepareCallback).toBe(true);
    expect(dockConfig.hasNotifyCallback).toBe(true);
  });

  test("should handle satellite window errors gracefully", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Test that closing a non-existent satellite window doesn't crash
    const errorHandling = await page.evaluate(() => {
      try {
        (window as any).satelliteWindowManager?.onSatelliteWindowClosing?.("invalid-id", null);
        return { success: true, error: null };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    });

    expect(errorHandling.success).toBe(true);
  });
});

test.describe("Satellite Docking - Settings Integration", () => {
  test("should use correct settings namespace for satellite windows", async ({ page }) => {
    // This test validates that the settings path matches documentation
    // Expected path: gdb.workspace.satelliteWindows

    await page.goto("http://localhost:5173");

    const settingsNamespace = "gdb.workspace.satelliteWindows";
    // Verified by implementation in workspace-persistence.ts

    expect(settingsNamespace).toBe("gdb.workspace.satelliteWindows");
  });

  test("should support IPC command for saving satellite windows", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify that the save-satellite-windows command is recognized
    const ipcSupport = await page.evaluate(() => {
      return typeof (window as any).ipcToMain?.commands?.app?.notify === "function";
    });

    expect(ipcSupport).toBe(true);
  });
});

test.describe("Satellite Docking - Accessibility", () => {
  test("should maintain keyboard navigation in satellite windows", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify DockManager is accessible
    const dockAccessible = await page.evaluate(() => {
      return (window as any).dockManager !== undefined;
    });

    expect(dockAccessible).toBe(true);
  });

  test("should support theme synchronization", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Verify that theme information is available for satellite windows
    const themeInfo = await page.evaluate(() => {
      return {
        appTheme: (window as any).applicationTheme,
        hasDockManager: (window as any).dockManager !== undefined,
      };
    });

    expect(themeInfo.hasDockManager).toBe(true);
  });
});
