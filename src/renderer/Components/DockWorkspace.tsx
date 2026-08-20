/**
 * DockWorkspace component for multi-host workspace rendering.
 *
 * @remarks
 * This component manages the dock-spawn-ts integration for a single workspace host.
 * It queries the workspace state from the main process, restores the saved layout,
 * and handles panel visibility and layout persistence.
 *
 * Key responsibilities:
 * - Query workspace state and filter windows for this host
 * - Initialize DockManager with proper configuration
 * - Restore layout from snapshot or fallback to default
 * - Handle panel lifecycle (register, show, hide)
 * - Persist layout changes back to main process
 */

import type { JSX } from "react";
import { Suspense, lazy, useEffect, useRef } from "react";
import { DockManager } from "../../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import type { WorkspaceState } from "../../common/workspace-types";
import { TOOL_WINDOW_TITLES } from "../ToolWindows/toolWindowTitles";
import { DockMenuConnector } from "../utilities/DockMenuConnector";
import { setDockMenuConnector } from "../utilities/dock-menu-state";
import {
  getHostIdFromUrl,
  hasUsableLayout,
  selectLayoutForRestore,
  serializeLayout,
} from "../utilities/dock-workspace-utils";
import { SAVE_DOCK_LAYOUT, UPDATE_WINDOW_LIST } from "../utilities/renderer-events";

/* Tool Windows */
import { ToolWindowErrorBoundary } from "../Errors/ToolWindowErrorBoundary";
import { ToolWindowsHostErrorBoundary } from "../Errors/ToolWindowsHostErrorBoundary";
import GdbCommandWindow from "../ToolWindows/GdbCommandWindow";
import GdbSourceWindow from "../ToolWindows/GdbSourceWindow";

/* Dialogs - Now managed by App.tsx, not DockWorkspace */
// The dialog lazy imports have been moved to App.tsx

// Lazy-loaded tool windows
const GdbLocalsWindow = lazy(() =>
  import("../ToolWindows/GdbLocalsWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbBreakpointsWindow = lazy(() =>
  import("../ToolWindows/GdbBreakpointsWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbMemoryWindow = lazy(() =>
  import("../ToolWindows/GdbMemoryWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbThreadsWindow = lazy(() =>
  import("../ToolWindows/GdbThreadsWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbDisassemblerWindow = lazy(() =>
  import("../ToolWindows/GdbDisassemblerWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbCallStackWindow = lazy(() =>
  import("../ToolWindows/GdbCallstackWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

const GdbRegistersWindow = lazy(() =>
  import("../ToolWindows/GdbRegistersWindow.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
);

// Icon imports - Using existing PNG icons from the icons directory
import iconLocal from "../icons/icons8-local-48.png?asset";
import iconSrc from "../icons/icons8-source-code-48.png?asset";

/**
 * Props for DockWorkspace component
 */
export interface DockWorkspaceProps {
  /** Workspace state from main process */
  workspaceState: WorkspaceState | null;
  /** Error callback if workspace initialization fails */
  onError?: (error: Error) => void;
}

/**
 * Wrapper component for deferred window initialization.
 * Suspends rendering until the window component loads.
 */
function DeferredWindow({
  title,
  children,
}: {
  title: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <Suspense fallback={<div>{title} Loading...</div>}>
      <ToolWindowErrorBoundary title={title}>{children}</ToolWindowErrorBoundary>
    </Suspense>
  );
}

/**
 * Primary tool windows layout definition.
 * These are the standard dockable panels available in the workspace.
 */
function PrimaryToolWindows(): JSX.Element {
  console.log("DockWorkspace: PrimaryToolWindows rendering");
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

      <div id="bpWindow" data-panel-caption={TOOL_WINDOW_TITLES.breakpoints} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.breakpoints}>
          <GdbBreakpointsWindow />
        </DeferredWindow>
      </div>

      <div id="memoryWindow" data-panel-caption={TOOL_WINDOW_TITLES.memory} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.memory}>
          <GdbMemoryWindow />
        </DeferredWindow>
      </div>

      <div id="threadsWindow" data-panel-caption={TOOL_WINDOW_TITLES.threads} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.threads}>
          <GdbThreadsWindow />
        </DeferredWindow>
      </div>

      <div id="disassemblyWindow" data-panel-caption={TOOL_WINDOW_TITLES.disassembly} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.disassembly}>
          <GdbDisassemblerWindow />
        </DeferredWindow>
      </div>

      <div id="callstackWindow" data-panel-caption={TOOL_WINDOW_TITLES.callstack} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.callstack}>
          <GdbCallStackWindow />
        </DeferredWindow>
      </div>

      <div id="registersWindow" data-panel-caption={TOOL_WINDOW_TITLES.registers} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.registers}>
          <GdbRegistersWindow />
        </DeferredWindow>
      </div>

      <div id="commandWindow" data-panel-caption={TOOL_WINDOW_TITLES.command} hidden={true}>
        <DeferredWindow title={TOOL_WINDOW_TITLES.command}>
          <GdbCommandWindow />
        </DeferredWindow>
      </div>
    </>
  );
}

/**
 * Wraps PrimaryToolWindows in error boundary.
 */
function DockLayout(): JSX.Element {
  return (
    <ToolWindowsHostErrorBoundary>
      <PrimaryToolWindows />
    </ToolWindowsHostErrorBoundary>
  );
}

/**
 * Setup listener for dock layout save requests with debouncing.
 * Serializes layout and sends to main process for persistence.
 * Debounces saves to avoid excessive IPC calls during rapid layout changes.
 */
function setupLayoutSaveListener(dockManager: DockManager, hostId: string): () => void {
  let savePending = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const performSave = async (): Promise<void> => {
    try {
      const layoutState = JSON.parse(dockManager.saveState());

      if (!hasUsableLayout(layoutState)) {
        console.log(
          `DockWorkspace: Skipping empty layout save for host ${hostId}; dock is still initializing or has no panels yet`,
        );
        return;
      }

      // Persist to the canonical config file key expected by the app settings state.
      window.ipcToMain.commands.app.notifyMain({
        command: "save-dock-layout",
        data: layoutState,
      });

      // Also keep the workspace state in sync for multi-host persistence.
      await window.ipcToMain.commands.workspace.saveHostLayout(hostId, layoutState);
      console.log(`DockWorkspace: Layout saved for host ${hostId}`);
    } catch (error) {
      console.error("DockWorkspace: Failed to save layout", error);
    }
  };

  const handleSaveDockLayout = (): void => {
    // Clear any pending save timer
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    // Set flag and schedule save with debounce
    savePending = true;
    saveTimer = setTimeout(async () => {
      savePending = false;
      saveTimer = null;
      await performSave();
    }, 500); // Debounce for 500ms
  };

  // Listen for save requests
  window.addEventListener(SAVE_DOCK_LAYOUT, handleSaveDockLayout);

  // Save layout before window unload (don't debounce this)
  const handleBeforeUnload = async (): Promise<void> => {
    // Cancel any pending debounced save
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    // Perform immediate save before unload
    if (savePending) {
      await performSave();
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    window.removeEventListener(SAVE_DOCK_LAYOUT, handleSaveDockLayout);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

/**
 * Build default layout for DockManager with standard panels.
 */
function buildDefaultLayout(dockManager: DockManager, menuConnector: DockMenuConnector): void {
  const rootNode = dockManager.context.model.rootNode;
  if (!rootNode) {
    return;
  }

  const documentNode = dockManager.context.model.documentManagerNode ?? rootNode;

  const panelByTitle = (title: string) => menuConnector.getDockPanelInfoByDisplayName(title)?.panel;
  const sourcePanel = panelByTitle(TOOL_WINDOW_TITLES.source);
  const threadsPanel = panelByTitle(TOOL_WINDOW_TITLES.threads);
  const callstackPanel = panelByTitle(TOOL_WINDOW_TITLES.callstack);
  const memoryPanel = panelByTitle(TOOL_WINDOW_TITLES.memory);
  const localsPanel = panelByTitle(TOOL_WINDOW_TITLES.locals);
  const breakpointsPanel = panelByTitle(TOOL_WINDOW_TITLES.breakpoints);
  const registersPanel = panelByTitle(TOOL_WINDOW_TITLES.registers);
  const disassemblyPanel = panelByTitle(TOOL_WINDOW_TITLES.disassembly);
  const commandPanel = panelByTitle(TOOL_WINDOW_TITLES.command);

  if (!sourcePanel) {
    return;
  }

  const sourceNode = dockManager.dockFill(documentNode, sourcePanel);
  const commandNode = commandPanel
    ? dockManager.dockRight(sourceNode, commandPanel, 0.5)
    : sourceNode;
  const sideNode = localsPanel ? dockManager.dockUp(commandNode, localsPanel, 0.5) : commandNode;

  if (threadsPanel) {
    dockManager.dockFill(sideNode, threadsPanel);
  }
  if (callstackPanel) {
    dockManager.dockFill(sideNode, callstackPanel);
  }
  if (memoryPanel) {
    dockManager.dockFill(sideNode, memoryPanel);
  }
  if (breakpointsPanel) {
    dockManager.dockFill(sideNode, breakpointsPanel);
  }
  if (registersPanel) {
    dockManager.dockFill(sideNode, registersPanel);
  }
  if (disassemblyPanel) {
    dockManager.dockFill(sideNode, disassemblyPanel);
  }
}

/**
 * Setup comprehensive layout listeners for dock container events.
 * Listens to multiple layout change events and triggers saves.
 */
function setupLayoutListeners(dockManager: DockManager): void {
  // Create layout listener with all available events
  const layoutListener = {
    onContainerResized: () => {
      console.log("DockWorkspace: Layout event - onContainerResized");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
    onTabChanged: () => {
      console.log("DockWorkspace: Layout event - onTabChanged");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
    // Handle panel additions
    onPanelAdded: () => {
      console.log("DockWorkspace: Layout event - onPanelAdded");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
    // Handle panel removals
    onPanelRemoved: () => {
      console.log("DockWorkspace: Layout event - onPanelRemoved");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
    // Handle before panel close
    onBeforePanelClose: () => {
      console.log("DockWorkspace: Layout event - onBeforePanelClose");
      return true; // Allow close
    },
    // Handle after panel close
    onAfterPanelClose: () => {
      console.log("DockWorkspace: Layout event - onAfterPanelClose");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    },
  };

  dockManager.addLayoutListener(layoutListener as never);

  // Watch for DOM mutations in the dock container that indicate layout changes
  // This catches drag-drop, splitter moves, and other visual changes
  const dockContainer = document.getElementById("revealDockManager");
  if (dockContainer && typeof MutationObserver !== "undefined") {
    const mutationObserver = new MutationObserver(() => {
      // Debounce mutations to avoid excessive saves during complex layout operations
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    });

    mutationObserver.observe(dockContainer, {
      attributes: true,
      attributeFilter: ["style", "class"],
      subtree: true,
      characterData: false,
      childList: true,
    });
  }
}

/**
 * Restore layout from workspace state or use fallback.
 *
 * @param dockManager - DockManager instance
 * @param menuConnector - DockMenuConnector instance
 * @param workspaceState - Current workspace state
 * @param hostId - Host ID for this workspace
 * @returns Whether layout was successfully restored
 */
async function attemptLayoutRestore(
  dockManager: DockManager,
  menuConnector: DockMenuConnector,
  workspaceState: WorkspaceState,
  hostId: string,
): Promise<boolean> {
  try {
    const settings = await window.ipcToMain.queries.app.getSettings();
    const configLayout = settings?.gui?.dockLayout as Record<string, unknown> | undefined;

    if (hasUsableLayout(configLayout)) {
      const layoutJson = serializeLayout(configLayout);
      console.log(
        `DockWorkspace: Restoring dock layout from gdb.gui.dockLayout for host ${hostId} (${layoutJson.length} chars)`,
      );
      await dockManager.loadState(layoutJson);
      return true;
    }
  } catch (error) {
    console.warn(
      `DockWorkspace: Could not read gdb.gui.dockLayout; falling back to workspace state`,
      error,
    );
  }

  const currentHost = workspaceState.hosts.find((h) => h.id === hostId);
  const hasSavedLayoutEntry = Object.prototype.hasOwnProperty.call(
    workspaceState.hostLayouts,
    hostId,
  );
  const savedLayout = hasSavedLayoutEntry ? workspaceState.hostLayouts[hostId] : undefined;

  if (!currentHost) {
    console.log(
      `DockWorkspace: Host ${hostId} is not present in the workspace; using default layout`,
    );
    return false;
  }

  if (!hasSavedLayoutEntry) {
    console.log(`DockWorkspace: No saved layout entry for host ${hostId}; using default layout`);
    return false;
  }

  if (!hasUsableLayout(savedLayout)) {
    console.log(
      `DockWorkspace: Saved layout entry exists but has no usable content for host ${hostId}; using default layout`,
    );
    return false;
  }

  try {
    const layoutToRestore = selectLayoutForRestore(savedLayout);
    console.log(`DockWorkspace: layoutToRestore keys:`, Object.keys(layoutToRestore));

    if (!hasUsableLayout(layoutToRestore)) {
      console.log(`DockWorkspace: No layout content to restore for host ${hostId}`);
      return false;
    }

    const layoutJson = serializeLayout(layoutToRestore);
    console.log(`DockWorkspace: Attempting to restore layout with ${layoutJson.length} chars`);
    await dockManager.loadState(layoutJson);
    console.log(`DockWorkspace: Successfully restored layout for host ${hostId}`);
    return true;
  } catch (restoreError) {
    console.warn(
      `DockWorkspace: Failed to restore layout for host ${hostId}, using fallback`,
      restoreError,
    );
    return false;
  }
}

/**
 * Register all available tool window panels.
 *
 * @param menuConnector - DockMenuConnector instance
 */
function registerAllPanels(menuConnector: DockMenuConnector): void {
  console.log("DockWorkspace: Registering panels...");
  menuConnector.registerPanel("sourceWindow", TOOL_WINDOW_TITLES.source, "Source code view");
  menuConnector.registerPanel("localsWindow", TOOL_WINDOW_TITLES.locals, "Local variables");
  menuConnector.registerPanel("bpWindow", TOOL_WINDOW_TITLES.breakpoints, "Breakpoints");
  menuConnector.registerPanel("memoryWindow", TOOL_WINDOW_TITLES.memory, "Memory view");
  menuConnector.registerPanel("threadsWindow", TOOL_WINDOW_TITLES.threads, "Threads");
  menuConnector.registerPanel("disassemblyWindow", TOOL_WINDOW_TITLES.disassembly, "Disassembly");
  menuConnector.registerPanel("callstackWindow", TOOL_WINDOW_TITLES.callstack, "Call stack");
  menuConnector.registerPanel("registersWindow", TOOL_WINDOW_TITLES.registers, "Registers");
  menuConnector.registerPanel("commandWindow", TOOL_WINDOW_TITLES.command, "GDB command line");
  console.log(`DockWorkspace: Registered ${menuConnector.getPanelList().length} panels`);
}

/**
 * Initialize DockManager with panels and restore or create layout.
 *
 * @param dockManagerElement - DOM element for DockManager
 * @param workspaceState - Current workspace state
 * @param hostId - Host ID for this workspace
 * @returns Initialized DockManager
 */
async function initializeDockManagerAndPanels(
  dockManagerElement: HTMLElement,
  workspaceState: WorkspaceState,
  hostId: string,
): Promise<DockManager> {
  const dockManager = new DockManager(dockManagerElement);
  dockManager.config.dialogRootElement = dockManagerElement;
  dockManager.config.enableBrowserWindows = false;
  dockManager.initialize();
  console.log("DockWorkspace: DockManager initialized");

  const menuConnector = new DockMenuConnector(dockManager);
  setDockMenuConnector(menuConnector);
  console.log("DockWorkspace: DockMenuConnector created");

  registerAllPanels(menuConnector);

  console.log("DockWorkspace: Creating all windows from DOM...");
  menuConnector.createAllWindows();
  console.log(`DockWorkspace: Created ${menuConnector.getPanelList().length} window containers`);

  const layoutRestored = await attemptLayoutRestore(
    dockManager,
    menuConnector,
    workspaceState,
    hostId,
  );

  if (!layoutRestored) {
    console.log(`DockWorkspace: Creating default layout for host ${hostId}`);
    buildDefaultLayout(dockManager, menuConnector);

    // IMPORTANT: Save the newly-built default layout to workspace persistence
    // Without this, the default layout is built but never saved, so it rebuilds every time the app starts
    try {
      const defaultLayoutState = JSON.parse(dockManager.saveState());

      if (!hasUsableLayout(defaultLayoutState)) {
        console.warn(
          `DockWorkspace: Default layout still empty for host ${hostId}; the dock has no real panels yet`,
        );
      } else {
        await window.ipcToMain.commands.workspace.saveHostLayout(hostId, defaultLayoutState);
        console.log(`DockWorkspace: Saved newly-built default layout for host ${hostId}`);
      }
    } catch (error) {
      console.error(`DockWorkspace: Failed to save default layout for host ${hostId}:`, error);
    }
  }

  setupLayoutListeners(dockManager);

  console.log("DockWorkspace: Reconciling panels...");
  menuConnector.reconsilePanels();
  console.log(
    `DockWorkspace: Reconciled, current panel count: ${menuConnector.getPanelList().length}`,
  );

  return dockManager;
}

/**
 * Custom hook to manage DockManager initialization and lifecycle.
 */
function useDockManagerInitialization(
  workspaceState: WorkspaceState | null,
  hostId: string,
  onError?: (error: Error) => void,
): void {
  const dockManagerRef = useRef<DockManager | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  const resizeDockManager = (dockManager: DockManager): void => {
    const dockRoot = document.getElementById("revealDockDiv");
    if (!dockRoot) {
      return;
    }

    // Measure the host container, not the dock element itself.
    // dock-spawn may set inline pixel sizes on the dock element, which can become stale
    // after outer window resizes and then prevent growth/shrink updates.
    const resizeWidth = Math.max(1, Math.floor(dockRoot.clientWidth));
    const resizeHeight = Math.max(1, Math.floor(dockRoot.clientHeight));

    dockManager.resize(resizeWidth, resizeHeight);
  };

  useEffect(() => {
    const initializeDockManager = async (): Promise<void> => {
      try {
        console.log("DockWorkspace: Starting initialization...");

        if (!workspaceState) {
          console.warn("DockWorkspace: No workspace state available");
          return;
        }

        console.log(`DockWorkspace: Host ID = ${hostId}`);

        const dockManagerElement = document.getElementById("revealDockManager");
        if (!dockManagerElement) {
          throw new Error("DockManager container element not found");
        }
        console.log("DockWorkspace: Found revealDockManager element");

        const dockManager = await initializeDockManagerAndPanels(
          dockManagerElement,
          workspaceState,
          hostId,
        );
        dockManagerRef.current = dockManager;

        console.log("DockWorkspace: Dispatching update events...");
        window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
        resizeDockManager(dockManager);

        const cleanupLayoutSaveListener = setupLayoutSaveListener(dockManager, hostId);

        const handleWindowResize = (): void => {
          resizeDockManager(dockManager);
          window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
        };

        const resizeObserver =
          typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(() => {
                resizeDockManager(dockManager);
              })
            : null;

        const dockRoot = document.getElementById("revealDockDiv");
        if (dockRoot && resizeObserver) {
          resizeObserver.observe(dockRoot);
        }

        window.addEventListener("resize", handleWindowResize);
        cleanupListenersRef.current = () => {
          window.removeEventListener("resize", handleWindowResize);
          resizeObserver?.disconnect();
          cleanupLayoutSaveListener();
        };

        console.log("DockWorkspace: Initialization complete!");
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("DockWorkspace: Failed to initialize", err);
        onError?.(err);
      }
    };

    initializeDockManager();

    return () => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
      setDockMenuConnector(null);
    };
  }, [workspaceState, hostId, onError]);
}

/**
 * DockWorkspace component - handles dock-spawn-ts initialization and layout restoration
 * for a single workspace host.
 *
 * @param props - Component props with workspace state
 * @returns JSX element for the dock workspace
 */
export function DockWorkspace({ workspaceState, onError }: DockWorkspaceProps): JSX.Element {
  console.log("DockWorkspace: Component rendered");
  const hostId = getHostIdFromUrl();
  useDockManagerInitialization(workspaceState, hostId, onError);

  return (
    <div id="revealDockDiv" className="dock-workspace-root">
      <div id="revealDockManager" className="revealDockManager"></div>
      <DockLayout />
    </div>
  );
}

export default DockWorkspace;
