/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { registerLicense } from "@syncfusion/ej2-base";
import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./syncfusion.css";
import { ComponentType, JSX, useEffect } from "react";
import type { GdbSettings } from "../common/settings-types";
import { SAVE_DOCK_LAYOUT } from "./utilities/renderer-events";
import { installPanelTabContextMenu } from "./utilities/panel-tab-context-menu";
import { DockMenuConnector } from "./utilities/DockMenuConnector";
import { dockMenuConnector, setDockMenuConnector } from "./utilities/dock-menu-state";
import { handleMovePanelFromWindow, handleMovePanelToWindow } from "./utilities/panel-transfer";
import { ToolWindowsHostErrorBoundary } from "./Errors/ToolWindowsHostErrorBoundary";
import { ToolWindowErrorBoundary } from "./Errors/ToolWindowErrorBoundary";
import { AppTheme, applyTheme } from "./theme-manager";
import { TOOL_WINDOW_TITLES } from "./ToolWindows/toolWindowTitles";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbDisassemblerWindow from "./ToolWindows/GdbDisassemblerWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbCallstackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbBreakpointsWindow from "./ToolWindows/GdbBreakpointsWindow";
import iconCmd from "./icons/icons8-command-line-48.png?asset";
import iconRegister from "./icons/icons8-cpu-48.png?asset";
import iconDisa from "./icons/icons8-disassembly-48.png?asset";
import iconBp from "./icons/icons8-dot-48.png?asset";
import iconHex from "./icons/icons8-hex-48.png?asset";
import iconLocal from "./icons/icons8-local-48.png?asset";
import iconSrc from "./icons/icons8-source-code-48.png?asset";
import iconStack from "./icons/icons8-stack-48.png?asset";
import iconThread from "./icons/icons8-thread-48.png?asset";
//import { NotifyRenderMessage } from "../common/ipc-contracts";

// Register Syncfusion component license
// Required for Syncfusion UI components (Grid, Docking, Dialog, etc.)
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JHaF5cWWdCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdlWXxdcXVSQmRfVUdxX0ZWYEo=",
);

// Expose build configuration to the global scope
// Used by various components to enable/disable debug features
window.revealGdbBuild = {
  debug: __REVEALGDB_DEBUG__,

  mode: __REVEALGDB_BUILD__,
};

let dockManager: DockManager;
let cleanupPanelTabContextMenu: (() => void) | undefined;

function registerAllPanels(connector: DockMenuConnector): void {
  connector.registerPanel(
    "sourceWindow",
    TOOL_WINDOW_TITLES.source,
    "Source Code Window",
    "wm-source",
  );
  connector.registerPanel(
    "localsWindow",
    TOOL_WINDOW_TITLES.locals,
    "Locals Variable Window",
    "wm-locals",
  );
  connector.registerPanel(
    "threadsWindow",
    TOOL_WINDOW_TITLES.threads,
    "Threads Window",
    "wm-thread",
  );
  connector.registerPanel(
    "callstackWindow",
    TOOL_WINDOW_TITLES.callstack,
    "Call Stack Window",
    "wm-stack",
  );
  connector.registerPanel("memoryWindow", TOOL_WINDOW_TITLES.memory, "Memory Window", "wm-hex");
  connector.registerPanel(
    "bpWindow",
    TOOL_WINDOW_TITLES.breakpoints,
    "Breakpoints Window",
    "wm-bp",
  );
  connector.registerPanel(
    "registersWindow",
    TOOL_WINDOW_TITLES.registers,
    "Registers Window",
    "wm-registers",
  );
  connector.registerPanel(
    "disassemblyWindow",
    TOOL_WINDOW_TITLES.disassembly,
    "Disassembly Window",
    "wm-disasm",
  );
  connector.registerPanel(
    "commandWindow",
    TOOL_WINDOW_TITLES.command,
    "GDB Command Window",
    "wm-command",
  );
}

type ToolWindowDefinition = {
  id: string;
  title: string;
  icon: string;
  WindowComponent: ComponentType;
};

const TOOL_WINDOWS: ToolWindowDefinition[] = [
  {
    id: "sourceWindow",
    title: TOOL_WINDOW_TITLES.source,
    icon: iconSrc,
    WindowComponent: GdbSourceWindow,
  },
  {
    id: "localsWindow",
    title: TOOL_WINDOW_TITLES.locals,
    icon: iconLocal,
    WindowComponent: GdbLocalsWindow,
  },
  {
    id: "threadsWindow",
    title: TOOL_WINDOW_TITLES.threads,
    icon: iconThread,
    WindowComponent: GdbThreadsWindow,
  },
  {
    id: "registersWindow",
    title: TOOL_WINDOW_TITLES.registers,
    icon: iconRegister,
    WindowComponent: GdbRegistersWindow,
  },
  {
    id: "disassemblyWindow",
    title: TOOL_WINDOW_TITLES.disassembly,
    icon: iconDisa,
    WindowComponent: GdbDisassemblerWindow,
  },
  {
    id: "commandWindow",
    title: TOOL_WINDOW_TITLES.command,
    icon: iconCmd,
    WindowComponent: GdbCommandWindow,
  },
  {
    id: "memoryWindow",
    title: TOOL_WINDOW_TITLES.memory,
    icon: iconHex,
    WindowComponent: GdbMemoryWindow,
  },
  {
    id: "callstackWindow",
    title: TOOL_WINDOW_TITLES.callstack,
    icon: iconStack,
    WindowComponent: GdbCallstackWindow,
  },
  {
    id: "bpWindow",
    title: TOOL_WINDOW_TITLES.breakpoints,
    icon: iconBp,
    WindowComponent: GdbBreakpointsWindow,
  },
];

function renderToolWindow({ id, title, icon, WindowComponent }: ToolWindowDefinition): JSX.Element {
  return (
    <div id={id} data-panel-caption={title} hidden={true} data-panel-icon={icon} key={id}>
      <ToolWindowErrorBoundary title={title}>
        <WindowComponent />
      </ToolWindowErrorBoundary>
    </div>
  );
}

function resizeDockManager(): void {
  if (!dockManager) {
    return;
  }

  const divDockManager = document.getElementById("revealDockDiv")!;
  dockManager.resize(
    window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
    window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
  );
}

type SavedLayoutEntry = {
  dockLayout?: unknown;
  title?: string;
};

function getSecondaryWindowLayoutIdFromLocation(): string | undefined {
  const layoutId = new URL(window.location.href).searchParams.get("layoutId")?.trim();
  return layoutId && layoutId.length > 0 ? layoutId : undefined;
}

function resolveSavedSecondaryDockLayout(
  gdb: GdbSettings,
  currentWindowTitle: string,
  layoutId?: string,
): unknown {
  const layouts = gdb.gui?.layouts;
  if (!layouts || typeof layouts !== "object") {
    return undefined;
  }

  if (layoutId) {
    const layoutEntry = layouts[layoutId] as SavedLayoutEntry | undefined;
    if (layoutEntry?.dockLayout !== undefined) {
      return layoutEntry.dockLayout;
    }
  }

  const normalizedTitle = currentWindowTitle.trim();
  if (normalizedTitle.length === 0) {
    return undefined;
  }

  const directEntry = layouts[normalizedTitle] as SavedLayoutEntry | undefined;
  if (directEntry?.dockLayout !== undefined) {
    return directEntry.dockLayout;
  }

  for (const [layoutId, layout] of Object.entries(layouts)) {
    if (layoutId === "main" || layoutId === "devtools") {
      continue;
    }
    const entry = layout as SavedLayoutEntry | undefined;
    if (typeof entry?.title !== "string" || entry.title.trim() !== normalizedTitle) {
      continue;
    }
    if (entry.dockLayout !== undefined) {
      return entry.dockLayout;
    }
  }

  return undefined;
}

async function initializeDockManager(gdb: GdbSettings): Promise<void> {
  const dockManagerElement = document.getElementById("revealDockManager")!;
  dockManager = new DockManager(dockManagerElement);
  dockManager.config.dialogRootElement = dockManagerElement;
  dockManager.config.enableBrowserWindows = false;
  dockManager.initialize();
  setDockMenuConnector(new DockMenuConnector(dockManager));
  if (!dockMenuConnector) {
    console.error("Failed to initialize DockMenuConnector");
    return;
  }

  registerAllPanels(dockMenuConnector);

  const layoutId = getSecondaryWindowLayoutIdFromLocation();
  const savedLayout = resolveSavedSecondaryDockLayout(gdb, window.document.title, layoutId);
  let loadedFromState = false;
  if (savedLayout) {
    try {
      await dockManager.loadState(JSON.stringify(savedLayout));
      loadedFromState = true;
    } catch (error) {
      console.warn("dock-spawn-ts: failed to restore saved secondary window layout", error);
    }
  }

  if (!loadedFromState) {
    dockMenuConnector.createAllWindows();
  }

  cleanupPanelTabContextMenu?.();
  cleanupPanelTabContextMenu = installPanelTabContextMenu(dockManager);
  dockMenuConnector.reconsilePanels();
  resizeDockManager();
}

function handleResize() {
  if (!dockManager) {
    return;
  }

  resizeDockManager();
  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
}

function moveAllPanelsToMainWindow(): void {
  const panelTitles = [
    ...new Set((dockMenuConnector?.getPanelList() ?? []).map((info) => info.displayName)),
  ];

  if (panelTitles.length === 0) {
    setTimeout(() => window.close(), 0);
    return;
  }

  panelTitles.forEach((panelTitle) => {
    window.ipcToMain.commands.app.notifyMain({
      command: "move-panel-to-window",
      data: { panelTitle, targetUniqueId: "main" },
    });
  });

  setTimeout(() => window.close(), 0);
}

export default function SecondaryWindow(): JSX.Element {
  useEffect(() => {
    window.ipcToMain.queries.app.getSettings().then(async (gdb: GdbSettings) => {
      const savedTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
      applyTheme(savedTheme);
      await initializeDockManager(gdb);
    });

    const unsubRender = window.ipcToMain.notifications.render((msg) => {
      switch (msg.command) {
        case "secondary-window-closing":
          moveAllPanelsToMainWindow();
          break;
        case "move-panel-from-window":
          handleMovePanelFromWindow(msg.data);
          break;
        case "move-panel-to-window":
          handleMovePanelToWindow(msg.data);
          break;
      }
    });

    const unsubTheme = window.ipcToMain.notifications.themeChanged?.((data) => {
      window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings) => {
        const currentTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
        if (currentTheme === "Auto") {
          applyTheme("Auto", data?.shouldUseDarkColors ?? false);
          return;
        }

        applyTheme(currentTheme);
      });
    });

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cleanupPanelTabContextMenu?.();
      cleanupPanelTabContextMenu = undefined;
      if (unsubRender) unsubRender();
      if (unsubTheme) unsubTheme();
    };
  }, []);

  return (
    <div id="revealDockDiv" className="full-size">
      <div id="revealDockManager" className="revealDockManager"></div>
      <ToolWindowsHostErrorBoundary>
        {TOOL_WINDOWS.map(renderToolWindow)}
      </ToolWindowsHostErrorBoundary>
    </div>
  );
}

window.onload = () => {
  window.ipcToMain.commands.app.notifyMain({ command: "secondary-window-loaded" });
  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
};

/**
 * Save dock layout before window unload.
 * Ensures user's window arrangement is preserved across sessions.
 */
window.addEventListener("beforeunload", () => {
  // console.log("******************************************");
  // console.log("Before Unloading Browser Window");
  // console.log("******************************************");

  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
});

// Notify main process that renderer has started initialization
window.ipcToMain.commands.app.notifyMain({ command: "renderStart" });

// Create and mount the React application
const container = document.getElementById("root")!;
createRoot(container).render(<SecondaryWindow />);

//window.document.title = "A Secondary Window";

// Notify main process that renderer initialization is complete
window.ipcToMain.commands.app.notifyMain({ command: "renderEnd" });

/**
 * Handle dock layout save requests.
 * Serializes the current layout and sends it to the main process for persistence.
 */
window.addEventListener(SAVE_DOCK_LAYOUT, () => {
  if (!dockManager) {
    return;
  }

  const layout = JSON.parse(dockManager.saveState());
  window.ipcToMain.commands.app.notifyMain({
    command: "save-dock-layout",
    data: {
      windowName: window.document.title,
      layout,
    },
  });
});
