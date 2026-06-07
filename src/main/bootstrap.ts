/**
 * Implements bootstrap for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `SettingsLike`, `configureAppSettings`, `logStartupDiagnostics`, `warmSystemFonts`, `maybeInstallDevTools`, `collectVersionInfo`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { screen } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import { fontace } from "fontace";
import getSystemFonts from "get-system-fonts";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import type { Display } from "electron";
import { AppSettings } from "./app-settings";
import { debugLog } from "./utilities/logger";

export type SettingsLike = {
  configure: (opts: {
    atomicSave: boolean;
    fileName: string;
    numSpaces: number;
    prettify: boolean;
  }) => void;
  file: () => string;
};

/**
 * Performs configure app settings as part of this module's public API.
 *
 * @param appSettings - Value for `appSettings` consumed by this operation.
 */
export function configureAppSettings(appSettings: SettingsLike): void {
  appSettings.configure({
    atomicSave: true,
    fileName: "settings.json",
    numSpaces: 2,
    prettify: true,
  });
}
/**
 * Performs applyDefaultSettings as part of this module's internal workflow.
 *
 * @param appSettings - appSettings parameter.
 * @returns The computed result produced by this operation.
 */

export function applyDefaultSettings(appSettings: typeof AppSettings): void {
  if (!fsSync.existsSync(appSettings.file())) {
    appSettings.setSync("gdb.gui.disableAutoSymbolLoading", false);
  }
  if (!appSettings.hasSync("gdb.dangerousCommands")) {
    appSettings.setSync("gdb.dangerousCommands", [
      {
        command: "python-interactive",
        reason: "Python Interactive is not implemented yet.  No guarantees expressed or implied.",
      },
      {
        command: "pi",
        reason: "Python Interactive is not implemented yet.  No guarantees expressed or implied.",
      },
    ] as never);
  }
}

/**
 * Performs log startup diagnostics as part of this module's public API.
 *
 * @param appSettings - Value for `appSettings` consumed by this operation.
 */
export function logStartupDiagnostics(appSettings: SettingsLike): void {
  const settingsFile = appSettings.file();
  debugLog(`Settings File: ${settingsFile}`);

  const displays = screen.getAllDisplays();
  displays.forEach((display: Display) => {
    debugLog(
      `Display: (${Math.floor(
        display.scaleFactor * display.bounds.width,
      )} x ${Math.floor(display.scaleFactor * display.bounds.height)})`,
    );
  });
}

/**
 * Performs warm system fonts as part of this module's public API.
 *
 * @param fontList - Map of keyed values consumed or updated by this operation.
 */
export function warmSystemFonts(fontList: Map<string, string>): void {
  getSystemFonts().then((fontArray: string[]) => {
    fontArray.forEach((fontFile) => {
      fs.readFile(fontFile).then((fileBuffer) => {
        try {
          const metaData = fontace(fileBuffer);
          fontList.set(metaData.family, "");
        } catch {
          return;
        }
      });
    });
  });
}

/**
 * Performs maybe install dev tools as part of this module's public API.
 *
 * @param isDebug - Value for `isDebug` consumed by this operation.
 */
export function maybeInstallDevTools(isDebug: boolean): void {
  if (!isDebug) {
    return;
  }

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => {
      debugLog(`Installed DevTools extension: ${name}`);
    })
    .catch((err) => {
      console.warn("Failed to install React DevTools extension:", err);
    });
}

/**
 * Performs collect version info as part of this module's public API.
 *
 * @param gdbAppInfo - Map of keyed values consumed or updated by this operation.
 */
export function collectVersionInfo(gdbAppInfo: Map<string, unknown>): void {
  gdbAppInfo.set("Node Version", process.version);
  gdbAppInfo.set("Architecture", os.arch());
  gdbAppInfo.set("Platform", process.platform);
  gdbAppInfo.set("OS Version", os.version());
  gdbAppInfo.set("Machine", os.machine());
  gdbAppInfo.set("Chrome Version", process.versions.chrome);
  gdbAppInfo.set("Electron Version", process.versions.electron);
  gdbAppInfo.set("v8 Version", process.versions.v8);
  gdbAppInfo.set("System Version", process.getSystemVersion());
  gdbAppInfo.set("Package Versions", process.versions);
}
