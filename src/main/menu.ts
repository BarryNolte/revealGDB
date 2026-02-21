/**
 * Application menu wiring for GDB actions and app commands.
 */
import { app, Menu, shell } from "electron";
import { gdbInterface, isDebug, isMac, mainWindow } from "./main";

export class GdbMenu {
  public static installMenu() {
    const template: object[] = [
      ...(isMac
        ? [
            {
              label: app.name,
              submenu: [
                {
                  label: "about",
                  click: () => {
                    mainWindow.webContents.send("notify-render", { command: "about-box" });
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
              mainWindow.webContents.send("notify-render", { command: "settings-dialog" });
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
          { role: "pasteAndMatchStyle" },
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
              mainWindow.webContents.send("notify-render", { command: "command-entry" });
            },
          },
        ],
      },
      {
        label: "&Debug",
        submenu: [
          {
            label: "Windows",
            submenu: [
              {
                label: "Source",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Locals",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Watch",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Call Stack",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Breakpoints",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Threads",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Memory",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Register",
                type: "checkbox",
                checked: true,
              },
              {
                label: "Disassembly",
                type: "checkbox",
                checked: true,
              },
            ],
          },
          {
            type: "separator",
          },
          {
            label: "Continue",
            accelerator: "F5",
            click: () => {
              gdbInterface.send("continue");
            },
          },
          {
            label: "Step Over",
            accelerator: "F10",
            click: () => {
              gdbInterface.send("next");
            },
          },
          {
            label: "Step Into",
            accelerator: "F8",
            click: () => {
              gdbInterface.send("step");
            },
          },
          {
            label: "Step Out",
            accelerator: "Shift+F11",
            click: () => {
              gdbInterface.send("finish");
            },
          },
        ],
      },
      {
        label: "Connections",
        submenu: [
          {
            label: "Configure...",
            click: () => {
              mainWindow.webContents.send("notify-render", { command: "connections-dialog" });
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
            label: "Learn More",
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
              mainWindow.webContents.send("notify-render", { command: "about-box" });
            },
          },
        ],
      },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }
}
