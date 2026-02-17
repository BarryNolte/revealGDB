import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

declare global {
  interface Window {
    __GDB_COMMAND_TEST_SETTINGS__?: {
      history: string[];
    };
    __GDB_COMMAND_TEST_API__?: {
      reset(): void;
      emitConsole(message: string): void;
      emitLog(message: string): void;
      emitError(message: string): void;
      emitDebug(message: string): void;
      getSentCommands(): string[];
      getSavedHistory(): string[];
      emitNotifyRender(obj: { command: string }): void;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "gdbcommand-test.html");

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
    const relativePath =
      requestUrl.pathname === "/" ? "/gdbcommand-test.html" : requestUrl.pathname;
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
    window.__GDB_COMMAND_TEST_SETTINGS__ = {
      history: ["help", "break main", "continue"],
    };
  });

  await page.goto(`${baseUrl}/gdbcommand-test.html`);
  await page.evaluate(() => window.__GDB_COMMAND_TEST_API__?.reset());
});

test("renders basic layout", async ({ page }) => {
  await expect(page.getByTestId("gdb-command-window")).toBeVisible();
  await expect(page.getByTestId("gdb-command-output")).toBeAttached();
  await expect(page.getByTestId("gdb-command-history")).toBeHidden();
  await expect(page.getByTestId("gdb-command-input")).toBeVisible();
  await expect(page.getByTestId("gdb-command-send")).toBeVisible();
  await expect(page.getByTestId("gdb-command-show-history")).toBeVisible();
});

test("routes console/log/error/debug output", async ({ page }) => {
  await page.evaluate(() => {
    window.__GDB_COMMAND_TEST_API__?.emitConsole("console-line");
    window.__GDB_COMMAND_TEST_API__?.emitLog("log-line");
    window.__GDB_COMMAND_TEST_API__?.emitError("error-line");
    window.__GDB_COMMAND_TEST_API__?.emitDebug("debug-line");
  });

  const output = page.getByTestId("gdb-command-output");
  await expect(output.locator(".rowConsole").last()).toHaveText("console-line");
  await expect(output.locator(".rowLog").last()).toHaveText("log-line");
  await expect(output.locator(".rowError").last()).toHaveText("error-line");
  await expect(output.locator(".rowDebug").last()).toHaveText("debug-line");
});

test("clear output window removes messages", async ({ page }) => {
  await page.evaluate(() => {
    window.__GDB_COMMAND_TEST_API__?.emitLog("first-line");
    window.__GDB_COMMAND_TEST_API__?.emitLog("second-line");
  });

  const output = page.getByTestId("gdb-command-output");
  await expect(output.locator(".rowLog")).toHaveCount(2);

  await page.getByTestId("gdb-command-clear").evaluate((el) => {
    (el as HTMLButtonElement).click();
  });

  await expect(output.locator(".rowLog")).toHaveCount(0);
  await expect(output).toHaveText("");
});

test("enter sends command and clears input", async ({ page }) => {
  const input = page.getByTestId("gdb-command-input");

  await input.fill("info registers");
  await input.press("Enter");

  await expect(input).toHaveValue("");

  const sent = await page.evaluate(() => window.__GDB_COMMAND_TEST_API__?.getSentCommands());
  expect(sent).toEqual(["info registers"]);

  const savedHistory = await page.evaluate(() =>
    window.__GDB_COMMAND_TEST_API__?.getSavedHistory(),
  );
  expect(savedHistory).toContain("info registers");
});

test("send button sends command", async ({ page }) => {
  const input = page.getByTestId("gdb-command-input");
  const sendButton = page.getByTestId("gdb-command-send");

  await input.fill("thread apply all bt");
  await sendButton.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });

  const sent = await page.evaluate(() => window.__GDB_COMMAND_TEST_API__?.getSentCommands());
  expect(sent).toEqual(["thread apply all bt"]);
});

test("history list toggles and selects", async ({ page }) => {
  const input = page.getByTestId("gdb-command-input");
  const historyButton = page.getByTestId("gdb-command-show-history");
  const historySelect = page.getByTestId("gdb-command-history");

  await historyButton.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
  await expect(historySelect).toBeVisible();
  await expect(historySelect.locator("option")).toHaveCount(3);

  await historySelect.selectOption({ index: 0 });
  await historySelect.press("Enter");
  await expect(historySelect).toBeHidden();
  await expect(input).toHaveValue("help");

  await historyButton.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
  await expect(historySelect).toBeVisible();
  await historySelect.press("Escape");
  await expect(historySelect).toBeHidden();
});

test("double-click history fills input", async ({ page }) => {
  const historyButton = page.getByTestId("gdb-command-show-history");
  const historySelect = page.getByTestId("gdb-command-history");
  const input = page.getByTestId("gdb-command-input");

  await historyButton.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
  await expect(historySelect).toBeVisible();

  await historySelect.selectOption({ index: 1 });
  await historySelect.dblclick();

  await expect(historySelect).toBeHidden();
  await expect(input).toHaveValue("break main");
});

test("notify render command focuses input", async ({ page }) => {
  const input = page.getByTestId("gdb-command-input");
  await expect(input).not.toBeFocused();

  await page.evaluate(() => {
    window.__GDB_COMMAND_TEST_API__?.emitNotifyRender({ command: "command-entry" });
  });

  await expect(input).toBeFocused();
});
