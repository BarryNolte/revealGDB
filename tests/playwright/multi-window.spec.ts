/**
 * multi-window.spec module.
 *
 * @remarks
 * Tests multi-window (satellite) creation and management functionality.
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { writePageCoverage } from "../helpers/playwright-coverage";

declare global {
  interface Window {
    __MULTIWINDOW_TEST_API__?: {
      reset(): void;
      emitNotifyRender(message: { command: string; data?: unknown }): void;
      getCreatedHosts(): Array<{ id: string; label: string }>;
      getDeletedHosts(): string[];
      getMovedPanes(): Array<{ paneId: string; targetHostId: string }>;
      getSavedLayouts(): Map<string, unknown>;
      getOpenedHosts(): string[];
      invokeCreateHost(label: string): Promise<string>;
      invokeDeleteHost(hostId: string): Promise<void>;
      invokeMovePane(paneId: string, sourceHostId: string, targetHostId: string): Promise<void>;
      invokeSaveHostLayout(hostId: string, layout: unknown): Promise<void>;
      invokeOpenHost(hostId: string): Promise<void>;
      getCurrentWorkspace(): {
        hosts?: Array<{ id: string; label: string; isVisible: boolean }>;
        hostLayouts?: Record<string, unknown>;
        windows?: Array<{
          id: string;
          hostId?: string;
          type?: string;
          layout?: { root?: { id?: string; windowIds?: string[] } };
        }>;
      };
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
      if (addr && typeof addr === "object") {
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

test("should create a new satellite host via IPC command", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  // Verify test API is available
  const apiExists = await page.evaluate(() => !!window.__MULTIWINDOW_TEST_API__);
  expect(apiExists).toBe(true);

  // Reset state
  await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.reset());

  // Create a new host
  const hostId = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.invokeCreateHost("Test Window"),
  );

  expect(hostId).toBeTruthy();
  expect(typeof hostId).toBe("string");

  // Verify host was added to workspace
  const workspace = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace(),
  );
  expect(workspace?.hosts).toContainEqual(
    expect.objectContaining({
      id: hostId,
      label: "Test Window",
      isVisible: true,
    }),
  );

  const satelliteWindow = workspace?.windows?.find(
    (window) => window.type === "satellite" && window.hostId === hostId,
  );
  expect(satelliteWindow).toBeTruthy();
});

test("should delete a satellite host via IPC command", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.reset());

  // Create a new host
  const hostId = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.invokeCreateHost("Window to Delete"),
  );

  // Verify it exists
  let workspace = await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace());
  expect(workspace?.hosts?.some((h) => h.id === hostId)).toBe(true);

  // Delete the host
  await page.evaluate((id) => window.__MULTIWINDOW_TEST_API__?.invokeDeleteHost(id), hostId);

  // Verify it was removed
  workspace = await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace());
  expect(workspace?.hosts?.some((h) => h.id === hostId)).toBe(false);
});

test("should move pane between hosts", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.reset());

  // Create a new host
  const hostId = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.invokeCreateHost("Target Window"),
  );

  // Move a pane to the new host
  const paneId = "pane-main";
  const sourceHostId = "main";
  await page.evaluate(
    ({ paneId: pid, sourceHostId: shid, targetHostId: thid }) =>
      window.__MULTIWINDOW_TEST_API__?.invokeMovePane(pid, shid, thid),
    { paneId, sourceHostId, targetHostId: hostId },
  );

  // Verify pane was moved
  const workspace = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace(),
  );
  const targetHostWindow = workspace?.windows?.find(
    (window) => window.type === "satellite" && window.hostId === hostId,
  );
  expect(targetHostWindow?.layout?.root?.id).toBe(paneId);
  expect(targetHostWindow?.layout?.root?.windowIds).toEqual(["window-1", "window-2"]);
});

test("should save and retrieve host layout", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.reset());

  // Create a new host
  const hostId = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.invokeCreateHost("Layout Test Window"),
  );

  // Save a layout
  const testLayout = { test: "data", nested: { value: 42 } };
  await page.evaluate(
    ({ id, layout }) => window.__MULTIWINDOW_TEST_API__?.invokeSaveHostLayout(id, layout),
    { id: hostId, layout: testLayout },
  );

  // Verify layout was saved
  const workspace = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace(),
  );
  expect(workspace?.hostLayouts?.[hostId as string]).toEqual(testLayout);
});

test("should handle auto-generated host labels", async ({ page }) => {
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.reset());

  // Create host without custom label (empty string)
  const hostId = await page.evaluate(() => window.__MULTIWINDOW_TEST_API__?.invokeCreateHost(""));

  // Verify auto-generated label uses hostId
  const workspace = await page.evaluate(() =>
    window.__MULTIWINDOW_TEST_API__?.getCurrentWorkspace(),
  );
  const host = workspace?.hosts?.find((h) => h.id === hostId);
  expect(host?.label).toMatch(/^Window [A-Z0-9]{4}$/);
});
