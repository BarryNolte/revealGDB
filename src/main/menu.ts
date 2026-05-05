/**
 * Implements menu for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `GdbMenu`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { app, Menu, shell } from "electron";
import { sendToRenderer } from "./ipc-sender";
import { miInterface } from "./mi-interface/mi-interface";
import { isDebug, isMac } from "./platform-info";

export class GdbMenu {
  /**
   * Performs install menu as part of this module's public API.
   *
   * @remarks
   * Performs asynchronous work and should be used with completion ordering in mind.
   */
  public static installMenu(gdbInterface: miInterface) {
    const template: object[] = [
      ...(isMac
        ? [
            {
              label: app.name,
              submenu: [
                {
                  label: "about",
                  click: () => {
                    sendToRenderer("notify-render", { command: "about-box" });
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
          ]
        : []),
      {
        label: "File",
        submenu: [
          {
            label: "&Preferences...",
            click: () => {
              sendToRenderer("notify-render", { command: "settings-dialog" });
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
      },
      {
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
      },
      {
        label: "View",
        submenu: [
          {
            label: "Command Entry",
            accelerator: "F1",
            click: () => {
              sendToRenderer("notify-render", { command: "command-entry" });
            },
          },
        ],
      },
      {
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
      },
      {
        label: "Connections",
        submenu: [
          {
            label: "Connect",
            click: () => {
              sendToRenderer("notify-render", { command: "connection-dialog" });
            },
          },
          {
            label: "Disconnect",
            click: () => {
              gdbInterface.disconnect();
              sendToRenderer("notify-render", { command: "cancel-connection" });
              gdbInterface.gdbDB.clearDatabase();
              gdbInterface.gdbDB.allDataUpdateUI();
            },
          },
          { type: "separator" },
          {
            label: "Configure...",
            click: () => {
              sendToRenderer("notify-render", { command: "connections-dialog" });
            },
          },
        ],
      },
      ...(isDebug
        ? [
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
          ]
        : []),
      {
        role: "help",
        submenu: [
          {
            label: "revealGDB on GitHub",
            click: async () => {
              await shell.openExternal("https://github.com/barrynolte/revealGDB");
            },
          },
          {
            type: "separator",
          },
          {
            label: "About",
            click: () => {
              sendToRenderer("notify-render", { command: "about-box" });
            },
          },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}
