/**
 * connection-dialog.spec module.
 *
 * @remarks
 * Source module for connection-dialog.spec.
 */

/**
 * @file connection-dialog.spec.ts
 * @description Source module for connection-dialog.spec.
 */

import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { writePageCoverage } from "../helpers/playwright-coverage";

declare global {
  interface Window {
    __CONNECTION_DIALOG_TEST_SETTINGS__?: {
      connections: Array<{
        name: string;
        shell: string;
        commands: string[];
        wslDistribution?: string;
      }>;
      lastUsedConnection?: string | null;
    };
    __CONNECTION_DIALOG_TEST_API__?: {
      getNotifyMainCalls: () => Array<{ command?: string; data?: unknown }>;
      reset: () => void;
      showDialog: () => void;
      hideDialog: () => void;
      selectConnection: (name: string) => void;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "connectiondialog-test.html");

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

function getConnectionDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /Connecting/ });
}

function getConnectionComboInput(page: Page): Locator {
  return getConnectionDialog(page).locator("#definedConnections").first();
}

async function clickWithViewportFallback(locator: Locator): Promise<void> {
  try {
    await locator.scrollIntoViewIfNeeded();
    await locator.click({ timeout: 2_000 });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isViewportIssue =
      message.includes("outside of the viewport") ||
      message.includes("not visible") ||
      message.includes("intercepts pointer events");

    if (!isViewportIssue) {
      throw error;
    }
  }

  await locator.evaluate((element: HTMLElement) => {
    element.click();
  });
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
      requestUrl.pathname === "/" ? "/connectiondialog-test.html" : requestUrl.pathname;
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
    server?.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (typeof address === "object" && address?.port) {
    baseUrl = `http://127.0.0.1:${address.port}`;
  }
});

test.afterAll(async () => {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((err) => (err ? reject(err) : resolve()));
  });
  server = undefined;
});

test.beforeEach(async ({ page }) => {
  test.skip(!fs.existsSync(OUTPUT_HTML), "Run npm run build:renderer first.");
  test.skip(!baseUrl, "Static server did not start.");

  await page.addInitScript(() => {
    window.__CONNECTION_DIALOG_TEST_SETTINGS__ = {
      connections: [
        { name: "Bash Session", shell: "bash", commands: ["gdb"] },
        { name: "WSL Session", shell: "wsl", commands: ["gdb"], wslDistribution: "Ubuntu" },
      ],
    };
  });

  await page.goto(`${baseUrl}/connectiondialog-test.html`);
  await page.evaluate(() => window.__CONNECTION_DIALOG_TEST_API__?.reset());
});

test("does not preselect a connection when lastUsedConnection is missing", async ({ page }) => {
  const dialog = getConnectionDialog(page);

  await expect(dialog).toBeVisible();
  await expect(getConnectionComboInput(page)).toHaveValue("");
});

test("restores lastUsedConnection when available", async ({ page }) => {
  await page.evaluate(() => {
    if (!window.__CONNECTION_DIALOG_TEST_SETTINGS__) {
      return;
    }

    window.__CONNECTION_DIALOG_TEST_SETTINGS__.lastUsedConnection = "WSL Session";
  });

  await page.evaluate(() => {
    window.__CONNECTION_DIALOG_TEST_API__?.showDialog();
  });

  await expect(getConnectionDialog(page)).toBeVisible();
  await expect(getConnectionComboInput(page)).toHaveValue("WSL Session");
});

test("saves selected connection on close and restores it on reopen", async ({ page }) => {
  await page.evaluate(() => {
    window.__CONNECTION_DIALOG_TEST_API__?.selectConnection("WSL Session");
  });
  await expect(getConnectionComboInput(page)).toHaveValue("WSL Session");

  await clickWithViewportFallback(
    getConnectionDialog(page).locator("button.e-dlg-closeicon-btn").first(),
  );

  const notifyCalls = await page.evaluate(
    () => window.__CONNECTION_DIALOG_TEST_API__?.getNotifyMainCalls() ?? [],
  );

  expect(notifyCalls.some((call) => call.command === "save-last-used-connection")).toBeTruthy();
  expect(
    notifyCalls.some(
      (call) => call.command === "save-last-used-connection" && call.data === "WSL Session",
    ),
  ).toBeTruthy();

  await page.evaluate(() => {
    window.__CONNECTION_DIALOG_TEST_API__?.showDialog();
  });

  await expect(getConnectionDialog(page)).toBeVisible();
  await expect(getConnectionComboInput(page)).toHaveValue("WSL Session");
});

test("does not preselect when lastUsedConnection is stale", async ({ page }) => {
  await page.evaluate(() => {
    if (!window.__CONNECTION_DIALOG_TEST_SETTINGS__) {
      return;
    }

    window.__CONNECTION_DIALOG_TEST_SETTINGS__.lastUsedConnection = "Missing Session";
  });

  await page.evaluate(() => {
    window.__CONNECTION_DIALOG_TEST_API__?.showDialog();
  });

  await expect(getConnectionDialog(page)).toBeVisible();
  await expect(getConnectionComboInput(page)).toHaveValue("");
});
