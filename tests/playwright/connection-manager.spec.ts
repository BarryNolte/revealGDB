/**
 * connection-manager.spec module.
 *
 * @remarks
 * Source module for connection-manager.spec.
 */

/**
 * @file connection-manager.spec.ts
 * @description Source module for connection-manager.spec.
 */

import { expect, test, type Locator } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { writePageCoverage } from "../helpers/playwright-coverage";

declare global {
  interface Window {
    __CONNECTION_MANAGER_TEST_SETTINGS__?: {
      connections: Array<{
        name: string;
        shell: string;
        commands: string[];
        wslDistribution?: string;
      }>;
      wslDistros: string[];
    };
    __CONNECTION_MANAGER_TEST_API__?: {
      getNotifyMainCalls: () => Array<{ command?: string; data?: { connections?: unknown[] } }>;
      reset: () => void;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "connectionmanager-test.html");

async function clickWithViewportFallback(button: Locator): Promise<void> {
  try {
    await button.scrollIntoViewIfNeeded();
    await button.click({ timeout: 2_000 });
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

  await button.evaluate((element: HTMLButtonElement) => {
    element.click();
  });
}

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
      requestUrl.pathname === "/" ? "/connectionmanager-test.html" : requestUrl.pathname;
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
    window.__CONNECTION_MANAGER_TEST_SETTINGS__ = {
      connections: [
        { name: "Bash Session", shell: "bash", commands: ["gdb"] },
        { name: "WSL Session", shell: "wsl", commands: ["gdb"], wslDistribution: "Ubuntu" },
      ],
      wslDistros: ["Ubuntu", "Debian"],
    };
  });

  await page.goto(`${baseUrl}/connectionmanager-test.html`);
  await page.evaluate(() => window.__CONNECTION_MANAGER_TEST_API__?.reset());
});

test("wsl distro select toggles enabled state with shell selection", async ({ page }) => {
  const shellSelect = page.locator("#shellSelect").first();
  const wslDistros = page.locator("#wslDistros").first();

  await expect(shellSelect).toBeVisible();
  await expect(wslDistros).toBeVisible();

  await shellSelect.selectOption("Bash");
  await expect(wslDistros).toBeDisabled();

  await shellSelect.selectOption("WSL");
  await expect(wslDistros).toBeEnabled();

  await shellSelect.selectOption("PowerShell");
  await expect(wslDistros).toBeDisabled();
});

test("adds connection and sends save-connections", async ({ page }) => {
  const nameInput = page.locator("#connectionName").first();
  const addButton = page.locator("#addConnectionButton").first();
  const rows = page.locator("#connectionsGrid .e-content tr.e-row");

  await expect(nameInput).toBeVisible();
  await expect(addButton).toBeVisible();

  await expect(rows).toHaveCount(2);

  await nameInput.fill("Added From Test");
  await expect(addButton).toBeEnabled();

  await clickWithViewportFallback(addButton);

  await expect(rows).toHaveCount(3);
  await expect(page.locator("#connectionsGrid")).toContainText("Added From Test");

  const notifyCalls = await page.evaluate(
    () => window.__CONNECTION_MANAGER_TEST_API__?.getNotifyMainCalls() ?? [],
  );

  expect(notifyCalls.length).toBeGreaterThan(0);
  const lastCall = notifyCalls.at(-1);
  expect(lastCall?.command).toBe("save-connections");

  const savedConnections = lastCall?.data?.connections ?? [];
  expect(savedConnections).toHaveLength(3);
  expect(
    savedConnections.some(
      (connection) => (connection as { name?: string }).name === "Added From Test",
    ),
  ).toBeTruthy();
});
