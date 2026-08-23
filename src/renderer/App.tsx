/**
 * Implements app for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `AppMainVersionInfo`, `App`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from "react";
import { JSX, RefObject, Suspense, lazy, useEffect, useRef } from "react";
import type { NotifyRenderMessage } from "../common/ipc-contracts";
import type { GdbSettings } from "../common/settings-types";
import { useWorkspace } from "./hooks/useWorkspace";
import { AppTheme, applyTheme } from "./theme-manager";
import { setAppMainVersionInfo } from "./utilities/app-version-state";

/* Dialogs */
import type { AboutBoxHandle } from "./Dialogs/AboutBox";
import type {
  ConnectionDialogProps,
  WhileConnectingDialogHandle,
} from "./Dialogs/ConnectionDialog.jsx";
import type { ConnectionManagerHandle } from "./Dialogs/ConnectionManager";
import type { SectionsViewHandle } from "./Dialogs/SectionsView";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import type { SettingsHandle } from "./Dialogs/Settings.jsx";
import { ToolWindowErrorBoundary } from "./Errors/ToolWindowErrorBoundary";
import { ToolWindowsHostErrorBoundary } from "./Errors/ToolWindowsHostErrorBoundary";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import { TOOL_WINDOW_TITLES } from "./ToolWindows/toolWindowTitles";
import { DockMenuConnector } from "./utilities/DockMenuConnector.js";
import { dockMenuConnector, setDockMenuConnector } from "./utilities/dock-menu-state";
import { SatelliteWindowManager } from "./utilities/SatelliteWindowManager";
import { SAVE_DOCK_LAYOUT, UPDATE_WINDOW_LIST } from "./utilities/renderer-events";

/**
 * Gets the host ID from the URL query parameters.
 * Satellite windows are loaded with ?dockHost=<hostId> query parameter.
 *
 * @returns The hostId (e.g., 'main', 'satellite-xyz'), defaults to 'main'
 */
function getHostIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("dockHost") || "main";
}

/**
 * Extend Window interface to include satellite window manager.
 * Used for lifecycle management and debugging access to the satellite window system.
 */
declare global {
  interface Window {
    satelliteWindowManager: SatelliteWindowManager | undefined;
  }
}

const AboutBox = lazy(() =>
  import("./Dialogs/AboutBox.js").then((module) => ({
    default: module.AboutBox as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<AboutBoxHandle>>;
const Settings = lazy(() =>
  import("./Dialogs/Settings.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<SettingsHandle>>;
const ConnectionManager = lazy(() =>
  import("./Dialogs/ConnectionManager.js").then((module) => ({
    default: module.ConnectionManager as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<ConnectionManagerHandle>>;
const ConnectionDialog = lazy(() =>
  import("./Dialogs/ConnectionDialog.js").then((module) => ({
    default: module.ConnectionDialog as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<
  ConnectionDialogProps & RefAttributes<WhileConnectingDialogHandle>
>;
const SectionsView = lazy(() =>
  import("./Dialogs/SectionsView.js").then((module) => ({
    default: module.SectionsView as unknown as () => JSX.Element,
  })),
) as unknown as ForwardRefExoticComponent<RefAttributes<SectionsViewHandle>>;
/**
 * Performs lazy window as part of this module's internal workflow.
 *
 * @remarks
 * Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param importer - Callback invoked when the associated event occurs.
 */
/**
 * Performs lazyWindow as part of this module's internal workflow.
 *
 * @param importer - importer parameter.
 * @returns The computed result produced by this operation.
 */
function lazyWindow(importer: () => Promise<{ default: unknown }>) {
  return lazy(importer as unknown as () => Promise<{ default: ComponentType }>);
}

const GdbBreakPointWindow = lazyWindow(() => import("./ToolWindows/GdbBreakpointsWindow.js"));
const GdbCallStackWindow = lazyWindow(() => import("./ToolWindows/GdbCallstackWindow.js"));
const GdbDisassemblerWindow = lazyWindow(() => import("./ToolWindows/GdbDisassemblerWindow.js"));
const GdbLocalsWindow = lazyWindow(() => import("./ToolWindows/GdbLocalsWindow.js"));
const GdbMemoryWindow = lazyWindow(() => import("./ToolWindows/GdbMemoryWindow.js"));
const GdbRegistersWindow = lazyWindow(() => import("./ToolWindows/GdbRegistersWindow.js"));
const GdbThreadsWindow = lazyWindow(() => import("./ToolWindows/GdbThreadsWindow.js"));

/* Dock Manager - Global instances */
/**
 * Main docking system manager.
 * Handles window layout, docking, undocking, and resizing operations.
 */
let dockManager: DockManager;

/**
 * Satellite window manager for multi-window docking support.
 * Persists for the application lifetime to handle satellite window lifecycle.
 */
let satelliteWindowManager: SatelliteWindowManager;

/**
 * Performs deferred window as part of this module's internal workflow.
 *
 * @param param1 - Value for `param1` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
/**
 * Performs DeferredWindow as part of this module's internal workflow.
 *
 * @param {
  title - {
  title parameter.
 * @param children - children parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */
function DeferredWindow({
  title,
  children,
}: {
  title: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <ToolWindowErrorBoundary title={title}>
      <Suspense fallback={null}>{children}</Suspense>
    </ToolWindowErrorBoundary>
  );
}

/* Icon Assets - Tool window icons loaded as static assets */
// Note: The ?asset query parameter tells Vite to treat these as static assets
// and return their URLs rather than inlining them
import iconCmd from "./icons/icons8-command-line-48.png?asset";
import iconRegister from "./icons/icons8-cpu-48.png?asset";
import iconDisa from "./icons/icons8-disassembly-48.png?asset";
import iconBp from "./icons/icons8-dot-48.png?asset";
import iconHex from "./icons/icons8-hex-48.png?asset";
import iconLocal from "./icons/icons8-local-48.png?asset";
import iconSrc from "./icons/icons8-source-code-48.png?asset";
import iconStack from "./icons/icons8-stack-48.png?asset";
import iconThread from "./icons/icons8-thread-48.png?asset";

/* Application Version Info */
/**
 * Version information for the application and its dependencies.
 * Populated asynchronously from the main process and displayed in the About dialog.
 */

function handleResize(): void {
  if (!dockMenuConnector) {
    return;
  }
  const divDockManager = document.getElementById("revealDockDiv")!;
  dockManager.resize(
    window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
    window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
  );
  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
}
/**
 * Performs handleAppChange as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @returns The computed result produced by this operation.
 */

function handleAppChange(e: Event): void {
  const detail = (e as CustomEvent).detail;
  if (detail?.theme) {
    applyTheme(detail.theme as AppTheme);
  }
}
/**
 * Performs setupLayoutListeners as part of this module's internal workflow.
 *
 * @param dm - dm parameter.
 * @returns The computed result produced by this operation.
 */

function setupLayoutListeners(dm: DockManager): void {
  dm.addLayoutListener({
    onContainerResized: () => {
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
    onTabChanged: () => {
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
  });
}
/**
 * Performs registerAllPanels as part of this module's internal workflow.
 *
 * @param connector - connector parameter.
 * @returns The computed result produced by this operation.
 */

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
/**
 * Performs createDefaultLayout as part of this module's internal workflow.
 *
 * @param dm - dm parameter.
 * @param connector - connector parameter.
 * @returns The computed result produced by this operation.
 */

function createDefaultLayout(dm: DockManager, connector: DockMenuConnector): void {
  if (!connector) return;
  connector.createAllWindows();
  const documentNode = dm.context.model.documentManagerNode;
  const srcNode = dm.dockFill(
    documentNode,
    connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.source),
  );
  const cmdNode = dm.dockRight(
    srcNode,
    connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.command),
    0.5,
  );
  const localsNode = dm.dockUp(
    cmdNode,
    connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.locals),
    0.5,
  );
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.threads));
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.callstack));
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.memory));
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.breakpoints));
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.registers));
  dm.dockFill(localsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.disassembly));
}

async function initializeDockManager(
  gdb: GdbSettings,
  workspace: ReturnType<typeof useWorkspace> | null,
): Promise<void> {
  const hostId = getHostIdFromUrl();
  const dockManagerElement = document.getElementById("revealDockManager")!;
  dockManager = new DockManager(dockManagerElement);
  dockManager.config.dialogRootElement = dockManagerElement;
  // Enable satellite windows (browser windows) for tool panels
  dockManager.config.enableBrowserWindows = true;
  dockManager.initialize();

  // Initialize satellite window manager for handling multi-window docking
  satelliteWindowManager = new SatelliteWindowManager(dockManager);
  console.log("[revealGDB] Satellite window manager initialized");

  // Expose satellite window manager on window object for debugging and lifecycle access
  window.satelliteWindowManager = satelliteWindowManager;

  setDockMenuConnector(new DockMenuConnector(dockManager));
  if (!dockMenuConnector) {
    console.error("Failed to initialize DockMenuConnector");
    return;
  }
  registerAllPanels(dockMenuConnector);
  setupLayoutListeners(dockManager);
  let loadedFromState = false;

  // Try to load per-host layout first, fallback to global dockLayout for backward compatibility
  let layoutToLoad: unknown = null;

  if (workspace?.workspace?.hostLayouts?.[hostId]) {
    // Use per-host layout if available
    layoutToLoad = workspace.workspace.hostLayouts[hostId];
    console.log(`[revealGDB] Loading per-host layout for hostId: ${hostId}`);
  } else if (gdb.gui?.dockLayout) {
    // Fallback to global dockLayout for backward compatibility (main window)
    layoutToLoad = gdb.gui.dockLayout;
    console.log("[revealGDB] Loading global dockLayout (backward compatibility)");
  }

  if (layoutToLoad) {
    try {
      // loadState is async in dock-spawn-ts; must await before resizing or
      // all panels stay hidden (resize fires before deserialization completes).
      await dockManager.loadState(JSON.stringify(layoutToLoad));
      loadedFromState = true;
    } catch (e) {
      // Saved layout is corrupt or incompatible — fall through to default layout.
      console.warn(
        `[revealGDB] Failed to restore layout for hostId: ${hostId}, using default layout`,
        e,
      );
    }
  }

  if (!loadedFromState) {
    createDefaultLayout(dockManager, dockMenuConnector);
    // After building default layout programmatically, we need to yield to the event loop
    // to allow React to render the panels before we try to resize/layout the dock manager.
    // This is necessary because createDefaultLayout only builds the layout tree;
    // the actual DOM elements need to be rendered by React first.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // After building default layout programmatically, save it to persistence
    // (programmatic dock operations don't trigger event listeners, so we must save manually)
    if (workspace && workspace.saveHostLayout) {
      try {
        const defaultLayout = JSON.parse(dockManager.saveState());
        await workspace.saveHostLayout({
          hostId,
          layout: defaultLayout,
        });
        console.log(`[revealGDB] Saved newly-built default dock layout for hostId: ${hostId}`);
      } catch (error) {
        console.error("[revealGDB] Failed to save default dock layout:", error);
      }
    }
  }
  dockMenuConnector.reconsilePanels();
  window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
  // Trigger initial sizing only after dock manager exists.
  // This calls handleResize() which invokes dockManager.resize() with proper dimensions.
  window.dispatchEvent(new Event("resize"));
}
/**
 * Performs PrimaryToolWindows as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function PrimaryToolWindows(): JSX.Element {
  return (
    <>
      <div
        id="sourceWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.source}
        hidden={true}
        data-panel-icon={iconSrc}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.source}>
          <GdbSourceWindow />
        </DeferredWindow>
      </div>
      <div
        id="localsWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.locals}
        hidden={true}
        data-panel-icon={iconLocal}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.locals}>
          <GdbLocalsWindow />
        </DeferredWindow>
      </div>
      <div
        id="threadsWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.threads}
        data-panel-icon={iconThread}
        hidden={true}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.threads}>
          <GdbThreadsWindow />
        </DeferredWindow>
      </div>
      <div
        id="registersWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.registers}
        hidden={true}
        data-panel-icon={iconRegister}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.registers}>
          <GdbRegistersWindow />
        </DeferredWindow>
      </div>
    </>
  );
}
/**
 * Performs SecondaryToolWindows as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function SecondaryToolWindows(): JSX.Element {
  return (
    <>
      <div
        id="disassemblyWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.disassembly}
        hidden={true}
        data-panel-icon={iconDisa}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.disassembly}>
          <GdbDisassemblerWindow />
        </DeferredWindow>
      </div>
      <div
        id="commandWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.command}
        hidden={true}
        data-panel-icon={iconCmd}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.command}>
          <GdbCommandWindow />
        </DeferredWindow>
      </div>
      <div
        id="memoryWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.memory}
        hidden={true}
        data-panel-icon={iconHex}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.memory}>
          <GdbMemoryWindow />
        </DeferredWindow>
      </div>
      <div
        id="callstackWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.callstack}
        hidden={true}
        data-panel-icon={iconStack}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.callstack}>
          <GdbCallStackWindow />
        </DeferredWindow>
      </div>
      <div
        id="bpWindow"
        data-panel-caption={TOOL_WINDOW_TITLES.breakpoints}
        hidden={true}
        data-panel-icon={iconBp}
      >
        <DeferredWindow title={TOOL_WINDOW_TITLES.breakpoints}>
          <GdbBreakPointWindow />
        </DeferredWindow>
      </div>
    </>
  );
}
/**
 * Performs DockLayout as part of this module's internal workflow.
 *
 * @returns The computed result produced by this operation.
 */

function DockLayout(): JSX.Element {
  return (
    <div id="revealDockDiv" className="full-size">
      <div id="revealDockManager" className="revealDockManager"></div>
      <ToolWindowsHostErrorBoundary>
        <PrimaryToolWindows />
        <SecondaryToolWindows />
      </ToolWindowsHostErrorBoundary>
    </div>
  );
}

interface AppDialogsProps {
  aboutBoxRef: RefObject<AboutBoxHandle | null>;
  settingsRef: RefObject<SettingsHandle | null>;
  connectionsRef: RefObject<ConnectionManagerHandle | null>;
  whileConnectingRef: RefObject<WhileConnectingDialogHandle | null>;
  sectionsViewRef: RefObject<SectionsViewHandle | null>;
}
/**
 * Performs AppDialogs as part of this module's internal workflow.
 *
 * @param {
  aboutBoxRef - {
  aboutBoxRef parameter.
 * @param settingsRef - settingsRef parameter.
 * @param connectionsRef - connectionsRef parameter.
 * @param whileConnectingRef - whileConnectingRef parameter.
 * @param sectionsViewRef - sectionsViewRef parameter.
 * @param } - } parameter.
 * @returns The computed result produced by this operation.
 */

function AppDialogs({
  aboutBoxRef,
  settingsRef,
  connectionsRef,
  whileConnectingRef,
  sectionsViewRef,
}: AppDialogsProps): JSX.Element {
  return (
    <>
      <Suspense fallback={null}>
        <AboutBox ref={aboutBoxRef} />
      </Suspense>
      <Suspense fallback={null}>
        <Settings ref={settingsRef} />
      </Suspense>
      <Suspense fallback={null}>
        <ConnectionManager ref={connectionsRef} />
      </Suspense>
      <Suspense fallback={null}>
        <ConnectionDialog
          ref={whileConnectingRef}
          connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
        />
      </Suspense>
      <Suspense fallback={null}>
        <SectionsView ref={sectionsViewRef} />
      </Suspense>
    </>
  );
}

/**
 * Setup workspace save dock layout handler.
 * Integrates with dock manager to persist layout changes to workspace settings.
 * Detects the current host ID from URL and saves layout for that specific host.
 *
 * @param workspace - The workspace state hook result
 */
function setupWorkspaceSaveDockLayout(workspace: ReturnType<typeof useWorkspace> | null): void {
  const hostId = getHostIdFromUrl();
  const handleSaveDockLayout = async (): Promise<void> => {
    if (!dockManager || !workspace) {
      return;
    }

    try {
      const layout = JSON.parse(dockManager.saveState());
      // Use workspace IPC instead of old notifyMain pattern
      await workspace.saveHostLayout({
        hostId,
        layout: layout,
      });
    } catch (error) {
      console.error(`Failed to save dock layout for hostId ${hostId} via workspace:`, error);
      // Fallback to old method for compatibility
      try {
        const layout = JSON.parse(dockManager.saveState());
        window.ipcToMain.commands.app.notifyMain({ command: "save-dock-layout", data: layout });
      } catch (fallbackError) {
        console.error("Fallback dock layout save also failed:", fallbackError);
      }
    }
  };

  // Store handler globally so event listener can access it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__workspaceSaveDockLayout = handleSaveDockLayout;
}

/**
 * Setup dialog listeners for app commands from main process.
 * Responds to main process notifications to show various dialogs.
 *
 * @param aboutBoxRef - Reference to about box dialog
 * @param whileConnectingRef - Reference to while connecting dialog
 * @param connectionsRef - Reference to connections dialog
 * @param settingsRef - Reference to settings dialog
 * @param sectionsViewRef - Reference to sections view dialog
 */
function setupDialogListeners(
  aboutBoxRef: RefObject<AboutBoxHandle>,
  whileConnectingRef: RefObject<WhileConnectingDialogHandle>,
  connectionsRef: RefObject<ConnectionManagerHandle>,
  settingsRef: RefObject<SettingsHandle>,
  sectionsViewRef: RefObject<SectionsViewHandle>,
): void {
  window.ipcToMain.queries.app.getVersionInfo().then((e) => {
    setAppMainVersionInfo(e);
  });

  // Listen for commands from main process to show dialogs
  window.ipcToMain.notifications.render((msg: NotifyRenderMessage) => {
    switch (msg.command) {
      case "about-box":
        aboutBoxRef.current?.ShowDialog();
        break;
      case "connection-dialog":
        whileConnectingRef.current?.ShowDialog();
        break;
      case "connections-dialog":
        connectionsRef.current?.ShowDialog();
        break;
      case "settings-dialog":
        settingsRef.current?.ShowDialog();
        break;
      case "sections-view":
        sectionsViewRef.current?.ShowDialog();
        break;
    }
  });
}

/**
 * Setup theme change listener for OS theme changes in Auto mode.
 * Fetches current theme setting and applies Auto theme if active.
 *
 * @returns Unsubscribe function for theme change listener
 */
function setupThemeChangeListener(): (() => void) | undefined {
  return window.ipcToMain.notifications.themeChanged?.((data) => {
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings) => {
      const currentTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
      if (currentTheme === "Auto") {
        applyTheme("Auto", data?.shouldUseDarkColors ?? false);
      }
    });
  });
}

/**
 * Performs app as part of this module's public API.
 *
 * @remarks
 * Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @returns The computed result produced by this operation.
 */
export default function App(): JSX.Element {
  // Refs for imperative access to child components
  const aboutBoxRef = useRef<AboutBoxHandle>(null);
  const settingsRef = useRef<SettingsHandle>(null);
  const connectionsRef = useRef<ConnectionManagerHandle>(null);
  const whileConnectingRef = useRef<WhileConnectingDialogHandle>(null);
  const sectionsViewRef = useRef<SectionsViewHandle>(null);

  // Workspace state for multi-window support
  const workspace = useWorkspace();

  // Initialize version info and dialog listeners
  useEffect(() => {
    setupDialogListeners(
      aboutBoxRef,
      whileConnectingRef,
      connectionsRef,
      settingsRef,
      sectionsViewRef,
    );
  }, []);

  // Setup dock manager integration and event listeners
  useEffect(() => {
    window.addEventListener("changeApplication", handleAppChange);

    // Handle OS theme changes pushed from the main process (Auto mode)
    const unsubTheme = setupThemeChangeListener();

    window.addEventListener("resize", handleResize);
    dockMenuConnector?.reconsilePanels();
    window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));

    // Setup workspace save handler that integrates with dock manager
    setupWorkspaceSaveDockLayout(workspace);

    // Cleanup function: remove event listeners on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("changeApplication", handleAppChange);
      if (unsubTheme) unsubTheme();
    };
  }, [workspace]);

  // Separate effect to initialize dock manager after workspace is loaded
  useEffect(() => {
    // Wait for workspace to be fully loaded before initializing dock manager
    if (workspace.isLoading || dockManager) {
      // Skip if workspace still loading or dock manager already initialized
      return;
    }

    // Load settings and apply theme before dock initialization
    window.ipcToMain.queries.app.getSettings().then(async (gdb: GdbSettings): Promise<void> => {
      // Apply saved theme before dock layout renders
      const savedTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
      applyTheme(savedTheme);
      await initializeDockManager(gdb, workspace);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.isLoading]);

  return (
    <div className={"main-page-container"}>
      <RevealToolbar
        connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
        whileConnectingRef={whileConnectingRef as RefObject<WhileConnectingDialogHandle>}
        settingsRef={settingsRef as RefObject<SettingsHandle>}
      />
      <DockLayout />
      <AppDialogs
        aboutBoxRef={aboutBoxRef}
        settingsRef={settingsRef}
        connectionsRef={connectionsRef}
        whileConnectingRef={whileConnectingRef}
        sectionsViewRef={sectionsViewRef}
      />
    </div>
  );
}

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

/**
 * Handle dock layout save requests.
 * Serializes the current layout and sends it to the main process for persistence.
 * Phase 4: Now uses workspace IPC instead of direct notifyMain.
 */
window.addEventListener(SAVE_DOCK_LAYOUT, () => {
  // Get the save handler from global scope (set in App component effect)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalSaveHandler = (window as any).__workspaceSaveDockLayout;
  if (globalSaveHandler) {
    globalSaveHandler().catch((error: unknown) => {
      console.error("Failed to save dock layout:", error);
    });
  }
});
