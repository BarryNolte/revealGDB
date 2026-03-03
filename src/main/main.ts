/**
 * Main process entry point: window lifecycle, IPC, and GDB wiring.
 */
import { app, BrowserWindow, ipcMain, nativeTheme, screen } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import settings from "electron-settings";
import { fontace } from "fontace";
import getSystemFonts from "get-system-fonts";
import fs from "node:fs/promises";
import os from "node:os";
import path, { join } from "path";
import { GdbAny, wait } from "../common/gdb-common";
import { GdbMenu } from "./menu";
import { gdbFunction } from "./mi-interface/gdb-state-database/gdbStateDatabase";
import { miInterface } from "./mi-interface/mi-interface";
import { WslUtilities } from "./utilities/wsl-utilities";

console.log(`PRELOAD: ${path.resolve("./out/preload/preload.js")}`);

export const isMac = process.platform === "darwin";
export const isWin = process.platform === "win32";
export const isLinux = !isMac && !isWin;

// eslint-disable-next-line no-undef
export const isDebug = __REVEALGDB_DEBUG__;

globalThis.revealGdbBuild = {
  // eslint-disable-next-line no-undef
  debug: __REVEALGDB_DEBUG__,
  // eslint-disable-next-line no-undef
  mode: __REVEALGDB_BUILD__,
};
console.log(`Build Info: ${JSON.stringify(globalThis.revealGdbBuild, null, 2)}`);

export const AppSettings = settings;
const fontList: Map<string, string> = new Map<string, string>();

export let mainWindow: BrowserWindow;
let debugWindow: BrowserWindow | undefined;

export let gdbInterface: miInterface;

export const gdbAppInfo: Map<string, GdbAny> = new Map<string, GdbAny>();

app.on("ready", () => {
  AppSettings.configure({
    atomicSave: true,
    fileName: "settings.json",
    numSpaces: 2,
    prettify: true,
  });

  /**
   * DEBUG: Usefull Information
   */
  const settingsFile = AppSettings.file();
  console.log(`Settings File: ${settingsFile}`);
  const displays = screen.getAllDisplays();
  displays.forEach((display: GdbAny) => {
    console.log(
      `Display: (${Math.floor(
        display.scaleFactor * display.bounds.width,
      )} x ${Math.floor(display.scaleFactor * display.bounds.height)})`,
    );
  });
  /* END DEBUG */

  // Cache system font names for renderer font pickers.
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

  if (isDebug) {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => {
        console.log(`Installed DevTools extension: ${name}`);
      })
      .catch((err) => {
        console.warn("Failed to install React DevTools extension:", err);
      });
  }

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
  //console.log("Version Info\n------------");
  //console.log(gdbAppInfo);

  mainWindow = new BrowserWindow({
    webPreferences: {
      /**
       * preload must be a absolute path for security reasons
       */
      preload: path.resolve("./out/preload/preload.js"),
    },
    show: false,
  });

  if (isDebug) {
    debugWindow = new BrowserWindow({
      x: 0,
      y: 0,
      width: 1200,
      height: 1200,
      autoHideMenuBar: true,
    });
    mainWindow.webContents.setDevToolsWebContents(debugWindow.webContents);
    mainWindow.webContents.openDevTools({
      mode: "detach",
      title: "revealGDB - I'm Special, I know how to debug...",
    });
  }

  //TODO!: Wait for GDB to be ready before loading the UI (Debug ONLY)
  if (isDebug) {
    wait(5000);
  }

  let devUrl = process.env.ELECTRON_RENDERER_URL;

  if (devUrl) {
    console.log("Loading URL:", devUrl);
    mainWindow.loadURL(devUrl);
  } else {
    console.log("Loading file:", join(__dirname, "..", "..", "out", "renderer", "index.html"));
    devUrl = join(__dirname, "..", "..", "out", "renderer", "index.html");
    mainWindow.loadFile(devUrl);
  }

  // Restore persisted window bounds on first show.
  mainWindow.once("ready-to-show", () => {
    const x = AppSettings.getSync("gdb.gui.windowSize.x") as number;
    const y = AppSettings.getSync("gdb.gui.windowSize.y") as number;
    const w = AppSettings.getSync("gdb.gui.windowSize.width") as number;
    const h = AppSettings.getSync("gdb.gui.windowSize.height") as number;

    if (x && y) {
      mainWindow.setPosition(x, y);
    }

    if (w && h) {
      mainWindow.setSize(w, h);
    }

    mainWindow.fullScreen = AppSettings.getSync("gdb.gui.windowSize.fullscreen") as boolean;

    mainWindow.show();
  });

  GdbMenu.installMenu();

  /**
   * UI is now up and running, now we can interact with GDB
   */
  // Initialize MI interface only after the UI exists.
  gdbInterface = new miInterface();
  gdbInterface.on("console-stream", (line: string) => {
    mainWindow.webContents.send("console-message", line);
  });
  gdbInterface.on("log-stream", (line: string) => {
    mainWindow.webContents.send("log-message", line);
  });
  gdbInterface.on("error-stream", (line: string) => {
    mainWindow.webContents.send("error-message", line);
  });
  gdbInterface.on("debug-stream", (line: string) => {
    mainWindow.webContents.send("debug-message", line);
  });

  let needToRunStartupCmds = true;
  // When we stop, then run all the stop commands
  gdbInterface.on("gdb-stopped", async () => {
    if (needToRunStartupCmds) {
      needToRunStartupCmds = false;
      const ros: string[] = (await AppSettings.get("gdb.run.onStartup")) as string[];
      console.log("** ON STARTUP COMMANDS **");
      ros?.forEach((ros: string) => {
        gdbInterface.send(ros);
      });

      gdbInterface.send("echo <<<<file-info>>>>");
      gdbInterface.send("info files");
      gdbInterface.send("echo >>>>end-capture<<<<");

      gdbInterface.send("echo <<<<function-names>>>>");
      gdbInterface.send("info functions");
      gdbInterface.send("echo >>>>end-capture<<<<");
    }

    const ros: string[] = (await AppSettings.get("gdb.run.onStopped")) as string[];
    console.log(
      `***********************\nRunning ${ros?.length} Stop Commands\n***********************`,
    );
    ros?.forEach((cmd: string) => {
      gdbInterface.send(cmd);
    });
  });

  let debugWindowClosed = false;
  mainWindow.on("closed", () => {
    if (debugWindow && !debugWindowClosed) {
      debugWindow.close();
    }
  });

  if (isDebug && debugWindow) {
    debugWindow.on("closed", () => {
      debugWindowClosed = true;
    });
  }
});

app.on("did-resign-active", () => {
  mainWindow.webContents.send("notify-render", {
    command: "theme-changed",
    data: nativeTheme,
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

nativeTheme.on("updated", () => {
  mainWindow.webContents.send("theme-changed", nativeTheme);
});

ipcMain.handle("getSettings", async (): Promise<string[]> => {
  return (await AppSettings.get("gdb")) as string[];
});

ipcMain.handle("getSystemFonts", (): Promise<string[]> => {
  return Promise.resolve(fontList.keys().toArray());
});

ipcMain.handle("getVersionInfo", (): Promise<Map<string, GdbAny>> => {
  return Promise.resolve(gdbAppInfo);
});

ipcMain.handle("getFunctionNames", (): Promise<gdbFunction[]> => {
  return Promise.resolve(gdbInterface.gdbDB.getAllFunctionNames());
});

// General messages from the UI
ipcMain.on("notify-main", async (_event: GdbAny, msg: GdbAny) => {
  switch (msg?.command) {
    case "save-connections":
      {
        await AppSettings.set("gdb.connections", msg.data.connections);
      }
      break;
    case "save-app-show-debug-info":
      {
        await AppSettings.set("gdb.gui.showDebugInfo", msg.data);
      }
      break;
    case "save-app-theme":
      {
        await AppSettings.set("gdb.gui.applicationTheme", msg.data);
      }
      break;
    case "save-cmd-history":
      {
        await AppSettings.set("gdb.command.history", msg.data);
      }
      break;
    case "save-source-viewer-theme":
      {
        await AppSettings.set("gdb.gui.sourceViewerTheme", msg.data);
      }
      break;
    case "save-source-viewer-font-size":
      {
        await AppSettings.set("gdb.gui.sourceViewerFontSize", msg.data);
      }
      break;
    case "save-source-viewer-font-name":
      {
        await AppSettings.set("gdb.gui.sourceViewerFontName", msg.data);
      }
      break;
    case "save-main-theme":
      {
        await AppSettings.set("gdb.gui.mainTheme", msg.data);
      }
      break;
    case "save-dock-layout":
      {
        AppSettings.setSync("gdb.gui.dockLayout", msg.data);

        const winPos = {
          /**
           * The -2 is for, I guess, the border around the window.
           */
          x: mainWindow.getPosition()[0],
          y: mainWindow.getPosition()[1],
          width: mainWindow.getSize()[0] - 2,
          height: mainWindow.getSize()[1] - 2,
          fullscreen: mainWindow.fullScreen,
        };
        AppSettings.setSync("gdb.gui.windowSize", winPos);
      }
      break;
    case "renderStart":
      {
        console.log("Notifying GDB Interface that rendering is starting.");
      }
      break;
    case "renderEnd":
      {
        console.log("Notifying GDB Interface that rendering is complete.");
        mainWindow.webContents.send("notify-render", {
          command: "command-entry",
        });

        // Don't connect until the UI is ready to recieve updates.
        mainWindow.webContents.send("notify-render", {
          command: "connection-started",
        });

        // Connect once renderer is ready to accept GDB events.
        gdbInterface
          .connect()
          .then((success: boolean) => {
            if (success) {
              mainWindow.webContents.send("notify-render", {
                command: "connection-success",
              });
            } else {
              mainWindow.webContents.send("notify-render", {
                command: "connection-failed",
              });
            }
          })
          .catch((reason: GdbAny) => {
            mainWindow.webContents.send("notify-render", {
              command: "connection-failed",
              data: reason,
            });
          });
      }
      break;
  }
});

/**
 * IPC *FROM* RENDERER
 */
ipcMain.on("gdb-command", (_event: GdbAny, command: string) => {
  OnGdbCommand(command);
});

function OnGdbCommand(command: string): void {
  // DOT commands, good for debugging, etc.
  if (command.startsWith(".")) {
    const cmdrgx = /.(?<cmd>.*)/.exec(command);
    const cmd = cmdrgx?.groups?.cmd || "";
    switch (cmd) {
      case "db":
        {
          gdbInterface.gdbDB.dump();
        }
        break;
      case "debug":
        {
          // eslint-disable-next-line no-debugger
          debugger;
        }
        break;
      case "wsl":
        {
          const distros = WslUtilities.getWslDistributions();
          console.log("*********************************************************");
          console.log("WSL Distros");
          console.log("*********************************************************");
          console.log(distros);
          console.log("*********************************************************");

          const sports = WslUtilities.getWslSerialPorts();
          console.log("*********************************************************");
          console.log("WSL Serial Ports");
          console.log("*********************************************************");
          console.log(sports);
          console.log("*********************************************************");
        }
        break;
      case "screen":
        {
          console.log("*********************************************************");
          console.log("Main Window Bounds: " + JSON.stringify(mainWindow.getBounds()));
          console.log("Full Screen       : " + JSON.stringify(mainWindow.fullScreen));
          console.log("*********************************************************");
        }
        break;
    }
  } else {
    gdbInterface.send(command);
  }
}
