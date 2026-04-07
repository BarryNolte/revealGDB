import { expect, test } from "@playwright/test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { writePageCoverage } from "../helpers/playwright-coverage";

declare global {
  interface Window {
    __TOOLBAR_TEST_SETTINGS__?: {
      windows: Array<{
        displayName: string;
        iconCss: string;
        hidden?: boolean;
      }>;
    };
    __TOOLBAR_TEST_API__?: {
      emitNotifyRender(message: { command: string }): void;
      getDialogCalls(): { connections: number; whileConnecting: number; settings: number };
      getNotifyMainCalls(): Array<{ command?: string; data?: unknown }>;
      getReconcileCount(): number;
      getSentCommands(): string[];
      getToggleWindowEvents(): string[];
      setWindows(windows: Array<{ displayName: string; iconCss: string; hidden?: boolean }>): void;
      dispatchWindowListUpdate(): void;
      reset(): void;
    };
  }
}

const OUTPUT_DIR = path.resolve(process.cwd(), "out", "renderer");
const OUTPUT_HTML = path.join(OUTPUT_DIR, "toolbar-test.html");

async function expectAriaDisabledState(
  page: Parameters<Parameters<typeof test.beforeEach>[0]>[0]["page"],
  selector: string,
  disabled: boolean,
): Promise<void> {
  await expect
    .poll(async () =>
      page.locator(selector).evaluate((element) => {
        return element.parentElement?.classList.contains("e-overlay") ?? false;
      }),
    )
    .toBe(disabled);
}

async function clickWithJavaScript(
  page: Parameters<Parameters<typeof test.beforeEach>[0]>[0]["page"],
  selector: string,
): Promise<void> {
  await page.locator(selector).evaluate((element) => {
    (element as HTMLButtonElement).click();
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
    const relativePath = requestUrl.pathname === "/" ? "/toolbar-test.html" : requestUrl.pathname;
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
    window.__TOOLBAR_TEST_SETTINGS__ = {
      windows: [
        { displayName: "Source", iconCss: "wm-source" },
        { displayName: "Command", iconCss: "wm-command", hidden: true },
      ],
    };
  });

  await page.goto(`${baseUrl}/toolbar-test.html`);
  await page.evaluate(() => window.__TOOLBAR_TEST_API__?.reset());
});

test("renders initial state and opens dialogs", async ({ page }) => {
  await expect(page.getByTestId("toolbar-test-page")).toBeVisible();
  await expectAriaDisabledState(page, "#toolbar-connect", false);
  await expectAriaDisabledState(page, "#toolbar-disconnect", true);
  await expectAriaDisabledState(page, "#toolbar-continue", true);

  await clickWithJavaScript(page, "#toolbar-connect");
  await clickWithJavaScript(page, "#toolbar-connections");
  await clickWithJavaScript(page, "#toolbar-settings");

  const dialogCalls = await page.evaluate(() => window.__TOOLBAR_TEST_API__?.getDialogCalls());
  expect(dialogCalls).toEqual({
    connections: 1,
    whileConnecting: 1,
    settings: 1,
  });
});

test("connection notifications toggle toolbar command availability", async ({ page }) => {
  await page.evaluate(() => {
    window.__TOOLBAR_TEST_API__?.emitNotifyRender({ command: "connection-started" });
  });

  await expectAriaDisabledState(page, "#toolbar-connect", true);
  await expectAriaDisabledState(page, "#toolbar-disconnect", false);
  await expectAriaDisabledState(page, "#toolbar-step-out", false);

  await clickWithJavaScript(page, "#toolbar-disconnect");

  const notifyCalls = await page.evaluate(() => window.__TOOLBAR_TEST_API__?.getNotifyMainCalls());
  expect(notifyCalls).toEqual([{ command: "cancel-connection" }]);

  await page.evaluate(() => {
    window.__TOOLBAR_TEST_API__?.emitNotifyRender({ command: "cancel-connection" });
  });

  await expectAriaDisabledState(page, "#toolbar-connect", false);
  await expectAriaDisabledState(page, "#toolbar-disconnect", true);
});

test("debugger controls send expected GDB commands", async ({ page }) => {
  await page.evaluate(() => {
    window.__TOOLBAR_TEST_API__?.emitNotifyRender({ command: "connection-success" });
  });

  await clickWithJavaScript(page, "#toolbar-continue");
  await clickWithJavaScript(page, "#toolbar-pause");
  await clickWithJavaScript(page, "#toolbar-stop");
  await clickWithJavaScript(page, "#toolbar-step-over");
  await clickWithJavaScript(page, "#toolbar-step-in");
  await clickWithJavaScript(page, "#toolbar-step-out");

  const sentCommands = await page.evaluate(() => window.__TOOLBAR_TEST_API__?.getSentCommands());
  expect(sentCommands).toEqual(["continue", "signal SIGINT", "kill", "next", "step", "finish"]);
});

test("window menu refreshes from dock state and dispatches toggle events", async ({ page }) => {
  await clickWithJavaScript(page, "#toolbar-window-menu_dropdownbtn");
  await expect(page.locator("li", { hasText: "Source" }).first()).toBeVisible();
  await expect(page.locator("li", { hasText: "Command" }).first()).toBeVisible();

  const initialReconcileCount = await page.evaluate(
    () => window.__TOOLBAR_TEST_API__?.getReconcileCount() ?? 0,
  );
  expect(initialReconcileCount).toBeGreaterThan(0);

  await clickWithJavaScript(page, "#toolbar-window-menu_dropdownbtn");

  await page.evaluate(() => {
    window.__TOOLBAR_TEST_API__?.setWindows([
      { displayName: "Locals", iconCss: "wm-locals" },
      { displayName: "Threads", iconCss: "wm-thread", hidden: true },
    ]);
    window.__TOOLBAR_TEST_API__?.dispatchWindowListUpdate();
  });

  await clickWithJavaScript(page, "#toolbar-window-menu_dropdownbtn");
  await expect(page.locator("li", { hasText: "Locals" }).first()).toBeVisible();
  await page
    .locator("li", { hasText: "Locals" })
    .first()
    .evaluate((element) => {
      (element as HTMLLIElement).click();
    });

  const toggleEvents = await page.evaluate(() =>
    window.__TOOLBAR_TEST_API__?.getToggleWindowEvents(),
  );
  expect(toggleEvents).toEqual(["Locals"]);
});
