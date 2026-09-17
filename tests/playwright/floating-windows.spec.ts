/**
 * floating-windows.spec module.
 *
 * @remarks
 * Tests floating window creation and management functionality.
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { writePageCoverage } from "../helpers/playwright-coverage";

declare global {
  interface Window {
    __FLOATING_WINDOW_TEST_API__?: {
      reset(): void;
      getCurrentWorkspace(): {
        windows?: Array<{
          id: string;
          type: "main" | "floating";
          bounds?: { x: number; y: number; width: number; height: number };
        }>;
      };
      invokeFloatWindow(windowId: string): Promise<string>;
      invokeDockWindow(floatingWindowId: string, targetPaneId: string): Promise<void>;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "multiwindow-test.html");

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html";
    case ".js":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".map":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

let server: http.Server | undefined;
let baseUrl = "";

test.afterEach(async ({ page }, testInfo) => {
  await writePageCoverage(page, testInfo);
});

test.beforeAll(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return;
  }

  server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const relativePath =
      requestUrl.pathname === "/" ? "/multiwindow-test.html" : requestUrl.pathname;
    const filePath = path.join(OUTPUT_DIR, decodeURIComponent(relativePath));

    if (!filePath.startsWith(OUTPUT_DIR)) {
      res.writeHead(403);
      res.end();
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }

      res.writeHead(200, { "Content-Type": getMimeType(filePath) });
      res.end(data);
    });
  });

  await new Promise<void>((resolve) => {
    server?.listen(0, "127.0.0.1", () => {
      const addr = server?.address();
      if (typeof addr === "object" && addr !== null) {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => {
      server?.close(() => resolve());
    });
  }
});

test("should float a window from dock to floating state", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("domcontentloaded");

  // Reset test API state
  await page.evaluate(() => {
    window.__FLOATING_WINDOW_TEST_API__?.reset();
  });

  // Float a window
  const floatingWindowId = await page.evaluate(async () => {
    return window.__FLOATING_WINDOW_TEST_API__?.invokeFloatWindow("window-1") ?? "";
  });

  expect(floatingWindowId).toBeTruthy();

  // Verify window is now floating
  const workspace = await page.evaluate(() => {
    return window.__FLOATING_WINDOW_TEST_API__?.getCurrentWorkspace();
  });

  const floatingWindow = workspace?.windows?.find(
    (w) => w.id === "window-1" && w.type === "floating",
  );
  expect(floatingWindow).toBeTruthy();
  expect(floatingWindow?.type).toBe("floating");
});

test("should dock a floating window back to main layout", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("domcontentloaded");

  // Reset test API state
  await page.evaluate(() => {
    window.__FLOATING_WINDOW_TEST_API__?.reset();
  });

  // First, float a window
  await page.evaluate(async () => {
    await window.__FLOATING_WINDOW_TEST_API__?.invokeFloatWindow("window-1");
  });

  // Verify it's floating
  let workspace = await page.evaluate(() => {
    return window.__FLOATING_WINDOW_TEST_API__?.getCurrentWorkspace();
  });
  let floatingWindow = workspace?.windows?.find((w) => w.type === "floating");
  expect(floatingWindow).toBeTruthy();

  // Now dock it back
  await page.evaluate(async () => {
    await window.__FLOATING_WINDOW_TEST_API__?.invokeDockWindow("window-1", "pane-main");
  });

  // Verify window is no longer floating
  workspace = await page.evaluate(() => {
    return window.__FLOATING_WINDOW_TEST_API__?.getCurrentWorkspace();
  });
  floatingWindow = workspace?.windows?.find((w) => w.id === "window-1" && w.type === "floating");
  expect(floatingWindow).toBeFalsy();
});

test("should preserve window bounds when floating", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("domcontentloaded");

  // Reset test API state
  await page.evaluate(() => {
    window.__FLOATING_WINDOW_TEST_API__?.reset();
  });

  // Float a window
  await page.evaluate(async () => {
    await window.__FLOATING_WINDOW_TEST_API__?.invokeFloatWindow("window-1");
  });

  // Verify bounds are set
  const workspace = await page.evaluate(() => {
    return window.__FLOATING_WINDOW_TEST_API__?.getCurrentWorkspace();
  });

  const floatingWindow = workspace?.windows?.find(
    (w) => w.id === "window-1" && w.type === "floating",
  );
  expect(floatingWindow?.bounds).toBeTruthy();
  expect(floatingWindow?.bounds?.width).toBeGreaterThan(0);
  expect(floatingWindow?.bounds?.height).toBeGreaterThan(0);
});

test("should handle multiple floating windows", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("domcontentloaded");

  // Reset test API state
  await page.evaluate(() => {
    window.__FLOATING_WINDOW_TEST_API__?.reset();
  });

  // Float multiple windows
  await page.evaluate(async () => {
    await window.__FLOATING_WINDOW_TEST_API__?.invokeFloatWindow("window-1");
    await window.__FLOATING_WINDOW_TEST_API__?.invokeFloatWindow("window-2");
  });

  // Verify both are floating
  const workspace = await page.evaluate(() => {
    return window.__FLOATING_WINDOW_TEST_API__?.getCurrentWorkspace();
  });

  const floatingWindows = workspace?.windows?.filter((w) => w.type === "floating") ?? [];
  expect(floatingWindows.length).toBe(2);
});
