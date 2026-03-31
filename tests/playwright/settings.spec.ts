import { expect, test, type Locator } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

declare global {
  interface Window {
    __SETTINGS_TEST_SETTINGS__?: {
      settings: {
        gui: {
          sourceViewerTheme: string;
          sourceViewerFontName: string;
          sourceViewerFontSize: string;
          showDebugInfo: boolean;
          applicationTheme: string;
        };
      };
      fonts: string[];
    };
    __SETTINGS_TEST_API__?: {
      getNotifyMainCalls: () => Array<{ command?: string; data?: unknown }>;
      getEditorEvents: () => Array<Record<string, unknown>>;
      getApplicationEvents: () => Array<Record<string, unknown>>;
      reset: () => void;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "settings-test.html");

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

async function selectDropdownValue(
  page: Parameters<typeof test.beforeEach>[0]["page"],
  row: Locator,
  optionText: string,
): Promise<void> {
  await row.getByRole("combobox").last().click();
  await page.locator("li.e-list-item", { hasText: optionText }).first().click();
}

function getSettingsDialog(page: Parameters<typeof test.beforeEach>[0]["page"]): Locator {
  return page.getByRole("dialog", { name: /Settings/ });
}

let server: http.Server | undefined;
let baseUrl = "";

test.beforeAll(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    return;
  }

  server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const relativePath = requestUrl.pathname === "/" ? "/settings-test.html" : requestUrl.pathname;
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
    window.__SETTINGS_TEST_SETTINGS__ = {
      settings: {
        gui: {
          sourceViewerTheme: "Monokai",
          sourceViewerFontName: "Fira Code",
          sourceViewerFontSize: "14",
          showDebugInfo: true,
          applicationTheme: "Light",
        },
      },
      fonts: ["Consolas", "Fira Code", "Cascadia Code"],
    };
  });

  await page.goto(`${baseUrl}/settings-test.html`);
  await page.evaluate(() => window.__SETTINGS_TEST_API__?.reset());
});

test("loads persisted settings into the dialog", async ({ page }) => {
  const dialog = getSettingsDialog(page);
  const appThemeRow = dialog.getByRole("row", { name: /^Theme:/ }).nth(0);
  const sourceThemeRow = dialog.getByRole("row", { name: /^Theme:/ }).nth(1);
  const fontSizeRow = dialog.getByRole("row", { name: /^Font Size:/ });

  await expect(dialog).toBeVisible();
  await expect(appThemeRow).toContainText("Light");
  await expect(dialog.getByRole("checkbox", { name: "Show debug info in terminal" })).toBeChecked();
  await expect(sourceThemeRow).toContainText("Monokai");
  await expect(fontSizeRow).toContainText("14");
});

test("changing settings dispatches app events and save commands", async ({ page }) => {
  const dialog = getSettingsDialog(page);
  const appThemeRow = dialog.getByRole("row", { name: /^Theme:/ }).nth(0);
  const sourceThemeRow = dialog.getByRole("row", { name: /^Theme:/ }).nth(1);
  const fontSizeRow = dialog.getByRole("row", { name: /^Font Size:/ });
  const debugInfoCheckbox = dialog.getByRole("checkbox", { name: "Show debug info in terminal" });

  await selectDropdownValue(page, appThemeRow, "Dark");
  await debugInfoCheckbox.uncheck();
  await selectDropdownValue(page, sourceThemeRow, "Github");
  await selectDropdownValue(page, fontSizeRow, "16");

  await expect(appThemeRow).toContainText("Dark");
  await expect(debugInfoCheckbox).not.toBeChecked();
  await expect(sourceThemeRow).toContainText("Github");
  await expect(fontSizeRow).toContainText("16");

  const results = await page.evaluate(() => ({
    notifyMainCalls: window.__SETTINGS_TEST_API__?.getNotifyMainCalls() ?? [],
    editorEvents: window.__SETTINGS_TEST_API__?.getEditorEvents() ?? [],
    applicationEvents: window.__SETTINGS_TEST_API__?.getApplicationEvents() ?? [],
  }));

  expect(results.notifyMainCalls).toEqual([
    { command: "save-app-theme", data: "Dark" },
    { command: "save-app-show-debug-info", data: false },
    { command: "save-source-viewer-theme", data: "Github" },
    { command: "save-source-viewer-font-size", data: "16" },
  ]);

  expect(results.applicationEvents).toEqual([{ theme: "Dark" }, { showDebugInfo: false }]);
  expect(results.editorEvents).toEqual([{ theme: "Github" }, { fontSize: 16 }]);
});
