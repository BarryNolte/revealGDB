# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: satellite-docking.spec.ts >> Satellite Docking - Multi-Window Support >> should provide cleanup for all satellite windows
- Location: tests\playwright\satellite-docking.spec.ts:103:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  4   |  * Satellite Docking Integration Tests
  5   |  *
  6   |  * Tests for multi-window support with satellite docking functionality.
  7   |  * Validates that tool windows can be opened in separate native windows
  8   |  * and that state persists across restarts.
  9   |  */
  10  | 
  11  | test.describe("Satellite Docking - Multi-Window Support", () => {
  12  |   test("should enable satellite docking configuration", async ({ page }) => {
  13  |     // Navigate to the application
  14  |     await page.goto("http://localhost:5173");
  15  | 
  16  |     // Verify DockManager has satellite windows enabled
  17  |     const satelliteConfigured = await page.evaluate(() => {
  18  |       // Check if revealGDB window has satellite window configuration
  19  |       return (window as any).dockManager?.config?.enableBrowserWindows === true;
  20  |     });
  21  | 
  22  |     expect(satelliteConfigured).toBe(true);
  23  |   });
  24  | 
  25  |   test("should initialize satellite window manager on app startup", async ({ page }) => {
  26  |     await page.goto("http://localhost:5173");
  27  | 
  28  |     // Wait for app to fully initialize
  29  |     await page.waitForTimeout(1000);
  30  | 
  31  |     // Check that satellite window manager is initialized
  32  |     const managerInitialized = await page.evaluate(() => {
  33  |       return (window as any).satelliteWindowManager !== undefined;
  34  |     });
  35  | 
  36  |     expect(managerInitialized).toBe(true);
  37  |   });
  38  | 
  39  |   test("should track satellite window lifecycle", async ({ page }) => {
  40  |     await page.goto("http://localhost:5173");
  41  | 
  42  |     // Get initial window count
  43  |     const initialCount = await page.evaluate(() => {
  44  |       return (window as any).satelliteWindowManager?.getSatelliteWindowCount?.() ?? 0;
  45  |     });
  46  | 
  47  |     expect(initialCount).toBe(0);
  48  | 
  49  |     // After opening a satellite window, count should increase
  50  |     // (This requires UI interaction with dock-spawn-ts, which would open a new window)
  51  |     // Note: Full E2E testing of new window creation requires multi-page context
  52  |   });
  53  | 
  54  |   test("should support multiple satellite windows", async ({ page, context }) => {
  55  |     await page.goto("http://localhost:5173");
  56  | 
  57  |     // Verify manager can track multiple windows
  58  |     const supportsMultiple = await page.evaluate(() => {
  59  |       const manager = (window as any).satelliteWindowManager;
  60  |       return {
  61  |         hasSatelliteWindows: typeof manager?.getSatelliteWindows === "function",
  62  |         hasWindowCount: typeof manager?.getSatelliteWindowCount === "function",
  63  |         hasGetWindowInfo: typeof manager?.getWindowInfo === "function",
  64  |       };
  65  |     });
  66  | 
  67  |     expect(supportsMultiple.hasSatelliteWindows).toBe(true);
  68  |     expect(supportsMultiple.hasWindowCount).toBe(true);
  69  |     expect(supportsMultiple.hasGetWindowInfo).toBe(true);
  70  |   });
  71  | 
  72  |   test("should persist satellite window state to settings", async ({ page }) => {
  73  |     await page.goto("http://localhost:5173");
  74  | 
  75  |     // Verify IPC channel exists for persisting satellite windows
  76  |     const ipcAvailable = await page.evaluate(() => {
  77  |       return typeof (window as any).ipcToMain?.commands?.app?.notify === "function";
  78  |     });
  79  | 
  80  |     expect(ipcAvailable).toBe(true);
  81  |   });
  82  | 
  83  |   test("should handle satellite window configuration changes", async ({ page }) => {
  84  |     await page.goto("http://localhost:5173");
  85  | 
  86  |     // Verify DockManager configuration is accessible
  87  |     const config = await page.evaluate(() => {
  88  |       const manager = (window as any).dockManager;
  89  |       return {
  90  |         enableBrowserWindows: manager?.config?.enableBrowserWindows,
  91  |         hasCallbacks: {
  92  |           prepareElement: typeof manager?.config?.prepareElementForNewWindow === "function",
  93  |           notifyNewWindow: typeof manager?.config?.notifyOnNewWindow === "function",
  94  |         },
  95  |       };
  96  |     });
  97  | 
  98  |     expect(config.enableBrowserWindows).toBe(true);
  99  |     expect(config.hasCallbacks.prepareElement).toBe(true);
  100 |     expect(config.hasCallbacks.notifyNewWindow).toBe(true);
  101 |   });
  102 | 
  103 |   test("should provide cleanup for all satellite windows", async ({ page }) => {
> 104 |     await page.goto("http://localhost:5173");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  105 | 
  106 |     // Verify cleanup method exists
  107 |     const hasCleanup = await page.evaluate(() => {
  108 |       return (
  109 |         typeof (window as any).satelliteWindowManager?.closeAllSatelliteWindows === "function"
  110 |       );
  111 |     });
  112 | 
  113 |     expect(hasCleanup).toBe(true);
  114 |   });
  115 | 
  116 |   test("should maintain satellite window state across settings", async ({ page }) => {
  117 |     await page.goto("http://localhost:5173");
  118 | 
  119 |     // Verify settings path for satellite windows
  120 |     const settingsPath = "gdb.workspace.satelliteWindows";
  121 | 
  122 |     // Check that the IPC command supports saving this state
  123 |     const canSaveSatellites = await page.evaluate(() => {
  124 |       // The app should be able to send save-satellite-windows command
  125 |       return typeof (window as any).ipcToMain !== "undefined";
  126 |     });
  127 | 
  128 |     expect(canSaveSatellites).toBe(true);
  129 |   });
  130 | 
  131 |   test("should integrate with dock-spawn-ts context menu", async ({ page }) => {
  132 |     await page.goto("http://localhost:5173");
  133 | 
  134 |     // Verify dock-spawn-ts is configured to show "Open in New Window" option
  135 |     const dockConfig = await page.evaluate(() => {
  136 |       const manager = (window as any).dockManager;
  137 |       return {
  138 |         enabled: manager?.config?.enableBrowserWindows === true,
  139 |         hasPrepareCallback:
  140 |           typeof manager?.config?.prepareElementForNewWindow === "function",
  141 |         hasNotifyCallback:
  142 |           typeof manager?.config?.notifyOnNewWindow === "function",
  143 |       };
  144 |     });
  145 | 
  146 |     expect(dockConfig.enabled).toBe(true);
  147 |     expect(dockConfig.hasPrepareCallback).toBe(true);
  148 |     expect(dockConfig.hasNotifyCallback).toBe(true);
  149 |   });
  150 | 
  151 |   test("should handle satellite window errors gracefully", async ({ page }) => {
  152 |     await page.goto("http://localhost:5173");
  153 | 
  154 |     // Test that closing a non-existent satellite window doesn't crash
  155 |     const errorHandling = await page.evaluate(() => {
  156 |       try {
  157 |         (window as any).satelliteWindowManager?.onSatelliteWindowClosing?.("invalid-id", null);
  158 |         return { success: true, error: null };
  159 |       } catch (err) {
  160 |         return { success: false, error: String(err) };
  161 |       }
  162 |     });
  163 | 
  164 |     expect(errorHandling.success).toBe(true);
  165 |   });
  166 | });
  167 | 
  168 | test.describe("Satellite Docking - Settings Integration", () => {
  169 |   test("should use correct settings namespace for satellite windows", async ({ page }) => {
  170 |     // This test validates that the settings path matches documentation
  171 |     // Expected path: gdb.workspace.satelliteWindows
  172 | 
  173 |     await page.goto("http://localhost:5173");
  174 | 
  175 |     const settingsNamespace = "gdb.workspace.satelliteWindows";
  176 |     // Verified by implementation in workspace-persistence.ts
  177 | 
  178 |     expect(settingsNamespace).toBe("gdb.workspace.satelliteWindows");
  179 |   });
  180 | 
  181 |   test("should support IPC command for saving satellite windows", async ({ page }) => {
  182 |     await page.goto("http://localhost:5173");
  183 | 
  184 |     // Verify that the save-satellite-windows command is recognized
  185 |     const ipcSupport = await page.evaluate(() => {
  186 |       return (
  187 |         typeof (window as any).ipcToMain?.commands?.app?.notify === "function"
  188 |       );
  189 |     });
  190 | 
  191 |     expect(ipcSupport).toBe(true);
  192 |   });
  193 | });
  194 | 
  195 | test.describe("Satellite Docking - Accessibility", () => {
  196 |   test("should maintain keyboard navigation in satellite windows", async ({
  197 |     page,
  198 |   }) => {
  199 |     await page.goto("http://localhost:5173");
  200 | 
  201 |     // Verify DockManager is accessible
  202 |     const dockAccessible = await page.evaluate(() => {
  203 |       return (window as any).dockManager !== undefined;
  204 |     });
```