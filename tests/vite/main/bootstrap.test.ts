// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const bootstrapMocks = vi.hoisted(() => ({
  getAllDisplays: vi.fn(),
  installExtension: vi.fn(),
  fontace: vi.fn(),
  getSystemFonts: vi.fn(),
  readFile: vi.fn(),
  arch: vi.fn(() => "x64"),
  version: vi.fn(() => "test-os"),
  machine: vi.fn(() => "machine-id"),
  debugLog: vi.fn(),
}));

vi.mock("electron", () => ({
  screen: {
    getAllDisplays: bootstrapMocks.getAllDisplays,
  },
}));

vi.mock("electron-devtools-installer", () => ({
  default: bootstrapMocks.installExtension,
  REACT_DEVELOPER_TOOLS: "react-devtools",
}));

vi.mock("fontace", () => ({
  fontace: bootstrapMocks.fontace,
}));

vi.mock("get-system-fonts", () => ({
  default: bootstrapMocks.getSystemFonts,
}));

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: bootstrapMocks.readFile,
  },
}));

vi.mock("../../../src/main/utilities/logger", () => ({
  debugLog: bootstrapMocks.debugLog,
  debugLogLines: vi.fn(),
}));

vi.mock("node:os", () => ({
  default: {
    arch: bootstrapMocks.arch,
    version: bootstrapMocks.version,
    machine: bootstrapMocks.machine,
  },
}));

import {
  collectVersionInfo,
  configureAppSettings,
  logStartupDiagnostics,
  maybeInstallDevTools,
  warmSystemFonts,
} from "../../../src/main/bootstrap";

describe("bootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("configures app settings with the expected persistence options", () => {
    const appSettings = {
      configure: vi.fn(),
      file: vi.fn(),
    };

    configureAppSettings(appSettings);

    expect(appSettings.configure).toHaveBeenCalledWith({
      atomicSave: true,
      fileName: "settings.json",
      numSpaces: 2,
      prettify: true,
    });
  });

  it("logs settings path and display sizes", () => {
    const appSettings = {
      configure: vi.fn(),
      file: vi.fn(() => "C:/settings.json"),
    };

    bootstrapMocks.getAllDisplays.mockReturnValue([
      { scaleFactor: 1.5, bounds: { width: 100, height: 200 } },
      { scaleFactor: 1, bounds: { width: 300, height: 400 } },
    ]);

    logStartupDiagnostics(appSettings);

    expect(bootstrapMocks.debugLog).toHaveBeenCalledWith("Settings File: C:/settings.json");
    expect(bootstrapMocks.debugLog).toHaveBeenCalledWith("Display: (150 x 300)");
    expect(bootstrapMocks.debugLog).toHaveBeenCalledWith("Display: (300 x 400)");
  });

  it("warms system fonts and skips unreadable metadata", async () => {
    const fontList = new Map<string, string>();

    bootstrapMocks.getSystemFonts.mockResolvedValue(["good.ttf", "bad.ttf"]);
    bootstrapMocks.readFile.mockImplementation(async (file: string) => Buffer.from(file));
    bootstrapMocks.fontace.mockImplementation((buffer: Buffer) => {
      const text = buffer.toString();
      if (text === "good.ttf") {
        return { family: "Fira Code" };
      }
      throw new Error("invalid font");
    });

    warmSystemFonts(fontList);

    await vi.waitFor(() => {
      expect(fontList.get("Fira Code")).toBe("");
    });
    expect(fontList.has("bad.ttf")).toBe(false);
  });

  it("installs React DevTools only in debug mode and logs failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    maybeInstallDevTools(false);
    expect(bootstrapMocks.installExtension).not.toHaveBeenCalled();

    bootstrapMocks.installExtension.mockResolvedValueOnce("React DevTools");
    maybeInstallDevTools(true);
    await vi.waitFor(() => {
      expect(bootstrapMocks.debugLog).toHaveBeenCalledWith(
        "Installed DevTools extension: React DevTools",
      );
    });

    bootstrapMocks.installExtension.mockRejectedValueOnce(new Error("install failed"));
    maybeInstallDevTools(true);
    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to install React DevTools extension:",
        expect.any(Error),
      );
    });
  });

  it("collects runtime version info into the app info map", () => {
    const appInfo = new Map<string, unknown>();
    const originalGetSystemVersion = process.getSystemVersion;
    process.getSystemVersion = vi.fn(() => "system-version");

    collectVersionInfo(appInfo);

    expect(appInfo.get("Architecture")).toBe("x64");
    expect(appInfo.get("OS Version")).toBe("test-os");
    expect(appInfo.get("Machine")).toBe("machine-id");
    expect(appInfo.get("System Version")).toBe("system-version");
    expect(appInfo.get("Package Versions")).toBe(process.versions);

    process.getSystemVersion = originalGetSystemVersion;
  });
});
