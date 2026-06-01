/**
 * Implements menu for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `GdbMenu`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, dialog, Menu, shell } from "electron";
import { AppSettings } from "./app-settings";
import { sendToRenderer } from "./ipc-sender";
import { miInterface } from "./mi-interface/mi-interface";
import { isDebug, isMac } from "./platform-info";

const NOTIFY_RENDER = "notify-render";

export class GdbMenu {
  private static buildMacMenu(): object[] {
    if (!isMac) return [];
    return [
      {
        label: app.name,
        submenu: [
          {
            label: "about",
            click: () => {
              sendToRenderer(NOTIFY_RENDER, { command: "about-box" });
            },
          },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          {
            label: "Exit",
            click: () => {
              app.quit();
            },
          },
        ],
      },
    ];
  }

  private static buildFileMenu(): object {
    return {
      label: "File",
      submenu: [
        {
          label: "&Preferences...",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "settings-dialog" });
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          click: () => {
            app.quit();
          },
        },
      ],
    };
  }

  private static buildEditMenu(): object {
    return {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { role: "selectAll" },
        { type: "separator" },
      ],
    };
  }

  private static buildViewMenu(): object {
    return {
      label: "View",
      submenu: [
        {
          label: "Sections...",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "sections-view" });
          },
        },
        {
          label: "Open Settings File",
          click: async () => {
            const filePath = AppSettings.file();
            const error = await shell.openPath(filePath);
            if (error) {
              dialog.showErrorBox(
                "Cannot Open Settings File",
                `No application is registered to open JSON files, or the file could not be opened.\n\n${error}`,
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Command Entry",
          accelerator: "F1",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "command-entry" });
          },
        },
      ],
    };
  }

  private static buildDebugMenu(gdbInterface: miInterface): object {
    return {
      label: "&Debug",
      submenu: [
        {
          label: "Continue",
          accelerator: "F5",
          click: () => {
            gdbInterface.continueExecution();
          },
        },
        {
          label: "Step Over",
          accelerator: "F10",
          click: () => {
            gdbInterface.stepOver();
          },
        },
        {
          label: "Step Into",
          accelerator: "F8",
          click: () => {
            gdbInterface.stepInto();
          },
        },
        {
          label: "Step Out",
          accelerator: "Shift+F11",
          click: () => {
            gdbInterface.stepOut();
          },
        },
        { type: "separator" },
        {
          label: "Pause",
          accelerator: "F6",
          click: () => {
            gdbInterface.pauseExecution();
          },
        },
        {
          label: "Stop Debugging",
          accelerator: "Shift+F5",
          click: () => gdbInterface.stopDebugging(),
        },
      ],
    };
  }

  private static buildConnectionsMenu(gdbInterface: miInterface): object {
    return {
      label: "Connections",
      submenu: [
        {
          label: "Connect",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "connection-dialog" });
          },
        },
        {
          label: "Disconnect",
          click: () => {
            gdbInterface.disconnect();
            sendToRenderer(NOTIFY_RENDER, { command: "cancel-connection" });
            gdbInterface.gdbDB.clearDatabase();
            gdbInterface.gdbDB.allDataUpdateUI();
          },
        },
        { type: "separator" },
        {
          label: "Configure...",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "connections-dialog" });
          },
        },
      ],
    };
  }

  private static buildElectronDebugMenu(): object[] {
    if (!isDebug) return [];
    return [
      {
        label: "Electron_Debug",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
    ];
  }

  private static buildHelpMenu(): object {
    return {
      role: "help",
      submenu: [
        {
          label: "revealGDB on GitHub",
          click: async () => {
            await shell.openExternal("https://github.com/barrynolte/revealGDB");
          },
        },
        { type: "separator" },
        {
          label: "About",
          click: () => {
            sendToRenderer(NOTIFY_RENDER, { command: "about-box" });
          },
        },
      ],
    };
  }

  /**
   * Performs install menu as part of this module's public API.
   *
   * @remarks
   * Performs asynchronous work and should be used with completion ordering in mind.
   */
  public static installMenu(gdbInterface: miInterface): void {
    const template: object[] = [
      ...GdbMenu.buildMacMenu(),
      GdbMenu.buildFileMenu(),
      GdbMenu.buildEditMenu(),
      GdbMenu.buildViewMenu(),
      GdbMenu.buildDebugMenu(gdbInterface),
      GdbMenu.buildConnectionsMenu(gdbInterface),
      ...GdbMenu.buildElectronDebugMenu(),
      GdbMenu.buildHelpMenu(),
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}
