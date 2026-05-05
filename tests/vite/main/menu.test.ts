import { afterEach, describe, expect, it, vi } from "vitest";

const buildFromTemplate = vi.fn((template) => template);
const setApplicationMenu = vi.fn();
const quit = vi.fn();
const openExternal = vi.fn();
const sendToRenderer = vi.fn();

vi.mock("electron", () => ({
  app: { name: "revealGDB", quit },
  Menu: {
    buildFromTemplate,
    setApplicationMenu,
  },
  shell: {
    openExternal,
  },
}));

function createMainMocks() {
  return {
    gdbInterface: {
      continueExecution: vi.fn(),
      stepOver: vi.fn(),
      stepInto: vi.fn(),
      stepOut: vi.fn(),
      pauseExecution: vi.fn(),
      stopDebugging: vi.fn(),
      disconnect: vi.fn(),
      gdbDB: {
        clearDatabase: vi.fn(),
        allDataUpdateUI: vi.fn(),
      },
    },
  };
}

describe("GdbMenu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("installs the standard app menu and wires debug and connection actions", async () => {
    const mainMocks = createMainMocks();

    vi.doMock("../../../src/main/ipc-sender", () => ({
      sendToRenderer,
    }));
    vi.doMock("../../../src/main/platform-info", () => ({
      isDebug: false,
      isMac: false,
    }));

    const { GdbMenu } = await import("../../../src/main/menu");
    GdbMenu.installMenu(mainMocks.gdbInterface as never);

    const template = buildFromTemplate.mock.calls[0][0] as Array<{
      label?: string;
      submenu?: unknown[];
      role?: string;
    }>;
    expect(setApplicationMenu).toHaveBeenCalledTimes(1);

    const fileMenu = template.find((item) => item.label === "File");
    const editMenu = template.find((item) => item.label === "Edit");
    const viewMenu = template.find((item) => item.label === "View");
    const debugMenu = template.find((item) => item.label === "&Debug");
    const connectionsMenu = template.find((item) => item.label === "Connections");
    const helpMenu = template.find((item) => item.role === "help");

    const preferencesItem = (fileMenu?.submenu as Array<{ click?: () => void }>)[0];
    const fileExitItem = (fileMenu?.submenu as Array<{ click?: () => void }>)[2];
    const commandEntryItem = (viewMenu?.submenu as Array<{ click?: () => void }>)[0];
    const continueItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[0];
    const stepOverItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[1];
    const stepIntoItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[2];
    const stepOutItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[3];
    const pauseItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[5];
    const stopItem = (debugMenu?.submenu as Array<{ click?: () => void }>)[6];
    const connectItem = (connectionsMenu?.submenu as Array<{ click?: () => void }>)[0];
    const disconnectItem = (connectionsMenu?.submenu as Array<{ click?: () => void }>)[1];
    const configureConnectionsItem = (connectionsMenu?.submenu as Array<{ click?: () => void }>)[3];
    const aboutItem = (helpMenu?.submenu as Array<{ click?: () => void }>)[2];
    const learnMoreItem = (helpMenu?.submenu as Array<{ click?: () => Promise<void> }>)[0];

    expect(editMenu?.submenu).toHaveLength(9);

    preferencesItem.click?.();
    fileExitItem.click?.();
    commandEntryItem.click?.();
    continueItem.click?.();
    stepOverItem.click?.();
    stepIntoItem.click?.();
    stepOutItem.click?.();
    pauseItem.click?.();
    stopItem.click?.();
    connectItem.click?.();
    disconnectItem.click?.();
    configureConnectionsItem.click?.();
    aboutItem.click?.();
    await learnMoreItem.click?.();

    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "settings-dialog",
    });
    expect(mainMocks.gdbInterface.continueExecution).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.stepOver).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.stepInto).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.stepOut).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.pauseExecution).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.stopDebugging).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.disconnect).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.gdbDB.clearDatabase).toHaveBeenCalledTimes(1);
    expect(mainMocks.gdbInterface.gdbDB.allDataUpdateUI).toHaveBeenCalledTimes(1);
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "command-entry",
    });
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "connection-dialog",
    });
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "cancel-connection",
    });
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "about-box",
    });
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "connections-dialog",
    });
    expect(openExternal).toHaveBeenCalledWith("https://github.com/barrynolte/revealGDB");
  });

  it("includes macOS and debug-only menu sections when enabled", async () => {
    const mainMocks = createMainMocks();

    vi.doMock("../../../src/main/ipc-sender", () => ({
      sendToRenderer,
    }));
    vi.doMock("../../../src/main/platform-info", () => ({
      isDebug: true,
      isMac: true,
    }));

    const { GdbMenu } = await import("../../../src/main/menu");
    GdbMenu.installMenu(mainMocks.gdbInterface as never);

    const template = buildFromTemplate.mock.calls[0][0] as Array<{
      label?: string;
      submenu?: unknown[];
    }>;
    const appMenu = template[0];
    const macAboutItem = (appMenu.submenu as Array<{ click?: () => void }>)[0];
    const macExitItem = (appMenu.submenu as Array<{ click?: () => void }>)[8];
    const debugMenu = template.find((item) => item.label === "Electron_Debug");

    macAboutItem.click?.();
    macExitItem.click?.();

    expect(appMenu.label).toBe("revealGDB");
    expect(debugMenu).toBeTruthy();
    expect(sendToRenderer).toHaveBeenCalledWith("notify-render", {
      command: "about-box",
    });
    expect(quit).toHaveBeenCalledTimes(1);
  });
});
