/**
 * basic.spec module.
 *
 * @remarks
 * Source module for basic.spec.
 */

/**
 * @file basic.spec.ts
 * @description Source module for basic.spec.
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

declare global {
  interface Window {
    __HEXEDITOR_TEST_DATA__: number[];
  }
}

const FIXTURE_PATH = path.resolve(process.cwd(), "test-files", "memdump.bin");
const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "hexeditor-test.html");
const MAX_BYTES = 256;
const OFFSET = 0x40000;

function readFixtureBytes(): number[] {
  const buffer = fs.readFileSync(FIXTURE_PATH);
  return Array.from(buffer).slice(0, MAX_BYTES);
}

function byteToHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

function byteToText(byte: number): string {
  return byte >= 32 && byte < 0x80 ? String.fromCharCode(byte) : ".";
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

test.beforeAll(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return;
  }

  server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const relativePath = requestUrl.pathname === "/" ? "/hexeditor-test.html" : requestUrl.pathname;
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
  test.skip(!fs.existsSync(FIXTURE_PATH), "Missing fixture ./test-files/memdump.bin.");
  test.skip(!fs.existsSync(OUTPUT_HTML), "Run npm run build:renderer first.");
  test.skip(!baseUrl, "Static server did not start.");

  const bytes = readFixtureBytes();
  await page.addInitScript((data) => {
    window.__HEXEDITOR_TEST_DATA__ = data;
  }, bytes);

  await page.goto(`${baseUrl}/hexeditor-test.html`);
});

test("renders synchronized views", async ({ page }) => {
  const data = readFixtureBytes();
  const expectedRows = Math.ceil(data.length / 16);

  await expect(page.getByTestId("hex-editor")).toBeVisible();

  const dataRows = page.getByTestId("hex-data-body").locator("tr");
  const textRows = page.getByTestId("hex-text-body").locator("tr");
  const offsetRows = page.getByTestId("hex-offset-body").locator("tr");

  await expect(dataRows).toHaveCount(expectedRows);
  await expect(textRows).toHaveCount(expectedRows);
  await expect(offsetRows).toHaveCount(expectedRows);
});

test("renders headers and sample values", async ({ page }) => {
  const data = readFixtureBytes();

  const dataHeaders = page.getByTestId("hex-data-table").locator("thead th");
  const textHeaders = page.getByTestId("hex-text-table").locator("thead th");

  await expect(dataHeaders).toHaveCount(16);
  await expect(textHeaders).toHaveCount(16);
  await expect(dataHeaders.first()).toHaveText("0");
  await expect(dataHeaders.nth(15)).toHaveText("F");

  const firstByte = data[0];
  const lastFirstRowByte = data[Math.min(15, data.length - 1)];

  const firstDataCell = page.locator("#dIdx-0");
  const lastDataCell = page.locator(`#dIdx-${Math.min(15, data.length - 1)}`);
  const firstTextCell = page.locator("#tIdx-0");

  await expect(firstDataCell).toHaveText(byteToHex(firstByte));
  await expect(lastDataCell).toHaveText(byteToHex(lastFirstRowByte));
  await expect(firstTextCell).toHaveText(byteToText(firstByte));

  const offsetCell = page.locator("#oIdx-0");
  await expect(offsetCell).toHaveText(OFFSET.toString(16).padStart(8, "0"));
});

test("hover highlights row and column", async ({ page }) => {
  const hoverCell = page.locator("#dIdx-0");
  const sameRowCell = page.locator("#dIdx-1");
  const sameColCell = page.locator("#dIdx-16");

  await hoverCell.hover();
  await expect(sameRowCell).toHaveCSS("background-color", "rgba(255, 127, 47, 0.4)");
  await expect(sameColCell).toHaveCSS("background-color", "rgba(255, 127, 47, 0.4)");
});

test("hex edit updates hex and text views", async ({ page }) => {
  const hexCell = page.locator("#dIdx-0");
  const textCell = page.locator("#tIdx-0");

  await hexCell.click();
  await page.keyboard.type("af");

  await expect(hexCell).toHaveText("AF");
  await expect(textCell).toHaveText(".");
  await expect(hexCell).toHaveClass(/he-data-changed/);
  await expect(textCell).toHaveClass(/he-data-changed/);
});

test("text edit updates hex and text views", async ({ page }) => {
  const textCell = page.locator("#tIdx-1");
  const hexCell = page.locator("#dIdx-1");

  await textCell.click();
  await page.keyboard.type("Z");

  await expect(textCell).toHaveText("Z");
  await expect(hexCell).toHaveText("5A");
  await expect(hexCell).toHaveClass(/he-data-changed/);
  await expect(textCell).toHaveClass(/he-data-changed/);
});

test("keyboard navigation moves edit cursor with arrows", async ({ page }) => {
  const startCell = page.locator("#dIdx-0");
  const rightCell = page.locator("#dIdx-1");
  const downCell = page.locator("#dIdx-17");
  const leftCell = page.locator("#dIdx-16");
  const upCell = page.locator("#dIdx-0");

  await startCell.click();
  await expect(startCell).toHaveClass(/cursor/);

  await page.keyboard.press("ArrowRight");
  await expect(rightCell).toHaveClass(/cursor/);

  await page.keyboard.press("ArrowDown");
  await expect(downCell).toHaveClass(/cursor/);

  await page.keyboard.press("ArrowLeft");
  await expect(leftCell).toHaveClass(/cursor/);

  await page.keyboard.press("ArrowUp");
  await expect(upCell).toHaveClass(/cursor/);
});

test("tab and enter advance the edit cursor", async ({ page }) => {
  const startCell = page.locator("#dIdx-2");
  const tabCell = page.locator("#dIdx-3");
  const enterCell = page.locator("#dIdx-4");

  await startCell.click();
  await expect(startCell).toHaveClass(/cursor/);

  await page.keyboard.press("Tab");
  await expect(tabCell).toHaveClass(/cursor/);

  await page.keyboard.press("Enter");
  await expect(enterCell).toHaveClass(/cursor/);
});
