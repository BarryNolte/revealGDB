import { screen } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import { fontace } from "fontace";
import getSystemFonts from "get-system-fonts";
import fs from "node:fs/promises";
import os from "node:os";
import { GdbAny } from "../common/gdb-common";

export type SettingsLike = {
  configure: (opts: {
    atomicSave: boolean;
    fileName: string;
    numSpaces: number;
    prettify: boolean;
  }) => void;
  file: () => string;
};

export function configureAppSettings(appSettings: SettingsLike): void {
  appSettings.configure({
    atomicSave: true,
    fileName: "settings.json",
    numSpaces: 2,
    prettify: true,
  });
}

export function logStartupDiagnostics(appSettings: SettingsLike): void {
  const settingsFile = appSettings.file();
  console.log(`Settings File: ${settingsFile}`);

  const displays = screen.getAllDisplays();
  displays.forEach((display: GdbAny) => {
    console.log(
      `Display: (${Math.floor(
        display.scaleFactor * display.bounds.width,
      )} x ${Math.floor(display.scaleFactor * display.bounds.height)})`,
    );
  });
}

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

export function maybeInstallDevTools(isDebug: boolean): void {
  if (!isDebug) {
    return;
  }

  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => {
      console.log(`Installed DevTools extension: ${name}`);
    })
    .catch((err) => {
      console.warn("Failed to install React DevTools extension:", err);
    });
}

export function collectVersionInfo(gdbAppInfo: Map<string, GdbAny>): void {
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
