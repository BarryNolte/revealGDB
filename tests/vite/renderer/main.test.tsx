// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";

// =============================================================================
// Hoisted mocks — must be defined before vi.mock() factory usage
// =============================================================================
const mainMocks = vi.hoisted(() => ({
  notifyMain: vi.fn(),
  createRoot: vi.fn(),
  renderFn: vi.fn(),
  registerLicense: vi.fn(),
}));

// Wire createRoot to return { render } before module is loaded
mainMocks.createRoot.mockReturnValue({ render: mainMocks.renderFn });

// =============================================================================
// Module mocks
// =============================================================================

// App component — simple stub to prevent its entire dependency tree from loading
vi.mock("../../../src/renderer/App", () => ({
  default: () => null,
}));

// react-dom/client
vi.mock("react-dom/client", () => ({
  createRoot: mainMocks.createRoot,
}));

// @syncfusion/ej2-base
vi.mock("@syncfusion/ej2-base", () => ({
  registerLicense: mainMocks.registerLicense,
}));

// =============================================================================
// Tests
// =============================================================================

describe("main.tsx side effects on module load", () => {
  beforeAll(async () => {
    // Set up window.ipcToMain BEFORE importing the module so the
    // module-level notifyMain calls find it.
    (window as Record<string, unknown>).ipcToMain = {
      commands: { app: { notifyMain: mainMocks.notifyMain } },
    };

    // Provide the #root element that createRoot expects
    if (!document.getElementById("root")) {
      const root = document.createElement("div");
      root.id = "root";
      document.body.appendChild(root);
    }

    // Importing triggers all module-level side effects
    await import("../../../src/renderer/main");
  });

  // --- Syncfusion license ---

  it("calls registerLicense once", () => {
    expect(mainMocks.registerLicense).toHaveBeenCalledTimes(1);
  });

  it("calls registerLicense with a non-empty string key", () => {
    const key = mainMocks.registerLicense.mock.calls[0][0] as unknown;
    expect(typeof key).toBe("string");
    expect((key as string).length).toBeGreaterThan(0);
  });

  // --- window.revealGdbBuild ---

  it("sets window.revealGdbBuild on load", () => {
    expect((window as Record<string, unknown>).revealGdbBuild).toBeDefined();
  });

  it("window.revealGdbBuild.debug is a boolean", () => {
    const build = (window as Record<string, unknown>).revealGdbBuild as {
      debug: boolean;
      mode: string;
    };
    expect(typeof build.debug).toBe("boolean");
  });

  it("window.revealGdbBuild.mode is a string", () => {
    const build = (window as Record<string, unknown>).revealGdbBuild as {
      debug: boolean;
      mode: string;
    };
    expect(typeof build.mode).toBe("string");
  });

  it("window.revealGdbBuild.mode is 'debug' or 'release'", () => {
    const build = (window as Record<string, unknown>).revealGdbBuild as {
      debug: boolean;
      mode: string;
    };
    expect(["debug", "release"]).toContain(build.mode);
  });

  // --- notifyMain calls ---

  it("calls notifyMain with { command: 'renderStart' }", () => {
    expect(mainMocks.notifyMain).toHaveBeenCalledWith({ command: "renderStart" });
  });

  it("calls notifyMain with { command: 'renderEnd' }", () => {
    expect(mainMocks.notifyMain).toHaveBeenCalledWith({ command: "renderEnd" });
  });

  it("calls notifyMain at least twice (renderStart and renderEnd)", () => {
    expect(mainMocks.notifyMain.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("renderStart is sent before renderEnd", () => {
    const commands = mainMocks.notifyMain.mock.calls.map(
      (c) => (c[0] as { command: string }).command,
    );
    const startIdx = commands.indexOf("renderStart");
    const endIdx = commands.indexOf("renderEnd");
    expect(startIdx).toBeGreaterThanOrEqual(0);
    expect(endIdx).toBeGreaterThanOrEqual(0);
    expect(startIdx).toBeLessThan(endIdx);
  });

  // --- React root creation ---

  it("calls createRoot once", () => {
    expect(mainMocks.createRoot).toHaveBeenCalledTimes(1);
  });

  it("calls createRoot with the #root DOM element", () => {
    const rootEl = document.getElementById("root");
    expect(mainMocks.createRoot).toHaveBeenCalledWith(rootEl);
  });

  it("calls render on the root once", () => {
    expect(mainMocks.renderFn).toHaveBeenCalledTimes(1);
  });
});
