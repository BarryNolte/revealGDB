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
const GdbLocalsWindow = lazy(() => import("../ToolWindows/GdbLocalsWindow"));

const GdbBreakpointsWindow = lazy(() => import("../ToolWindows/GdbBreakpointsWindow"));

const GdbMemoryWindow = lazy(() => import("../ToolWindows/GdbMemoryWindow"));

const GdbThreadsWindow = lazy(() => import("../ToolWindows/GdbThreadsWindow"));

const GdbDisassemblerWindow = lazy(() => import("../ToolWindows/GdbDisassemblerWindow"));

const GdbCallStackWindow = lazy(() => import("../ToolWindows/GdbCallstackWindow"));

const GdbRegistersWindow = lazy(() => import("../ToolWindows/GdbRegistersWindow"));

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
 * DockWorkspace component - handles dock-spawn-ts initialization and layout restoration
 * for a single workspace host.
 *
 * @param props - Component props with workspace state
 * @returns JSX element for the dock workspace
 */
export function DockWorkspace({ workspaceState, onError }: DockWorkspaceProps): JSX.Element {
  console.log("DockWorkspace: Component rendered");
  const dockManagerRef = useRef<DockManager | null>(null);
  const hostIdRef = useRef<string>(getHostIdFromUrl());
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  const resizeDockManager = (dockManager: DockManager): void => {
    const dockRoot = document.getElementById("revealDockDiv");
    if (!dockRoot) {
      return;
    }

    dockManager.resize(
      window.innerWidth - (dockRoot.clientLeft + dockRoot.offsetLeft),
      window.innerHeight - (dockRoot.clientTop + dockRoot.offsetTop),
    );
  };

  const buildDefaultLayout = (dockManager: DockManager, menuConnector: DockMenuConnector): void => {
    const rootNode = dockManager.context.model.rootNode;
    if (!rootNode) {
      return;
    }

    const documentNode = dockManager.context.model.documentManagerNode ?? rootNode;

    const panelByTitle = (title: string) =>
      menuConnector.getDockPanelInfoByDisplayName(title)?.panel;
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
  };

  const setupLayoutListeners = (dockManager: DockManager): void => {
    dockManager.addLayoutListener({
      onContainerResized: () => {
        window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
        window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
      },
      onTabChanged: () => {
        window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
        window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
      },
    });
  };

  /**
   * Setup listener for dock layout save requests.
   * Serializes layout and sends to main process for persistence.
   */
  const setupLayoutSaveListener = (dockManager: DockManager, hostId: string): (() => void) => {
    const handleSaveDockLayout = async (): Promise<void> => {
      try {
        const layoutState = JSON.parse(dockManager.saveState());
        // Send to main process to persist
        await window.ipcToMain.commands.workspace.saveHostLayout(hostId, layoutState);
        console.log(`DockWorkspace: Layout saved for host ${hostId}`);
      } catch (error) {
        console.error("DockWorkspace: Failed to save layout", error);
      }
    };

    // Listen for save requests
    window.addEventListener(SAVE_DOCK_LAYOUT, handleSaveDockLayout);

    // Save layout before window unload
    const handleBeforeUnload = (): void => {
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener(SAVE_DOCK_LAYOUT, handleSaveDockLayout);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  };

  useEffect(() => {
    const initializeDockManager = async (): Promise<void> => {
      try {
        console.log("DockWorkspace: Starting initialization...");

        if (!workspaceState) {
          console.warn("DockWorkspace: No workspace state available");
          return;
        }

        const hostId = hostIdRef.current;
        console.log(`DockWorkspace: Host ID = ${hostId}`);

        const dockManagerElement = document.getElementById("revealDockManager");
        if (!dockManagerElement) {
          throw new Error("DockManager container element not found");
        }
        console.log("DockWorkspace: Found revealDockManager element");

        // Initialize DockManager
        const dockManager = new DockManager(dockManagerElement);
        dockManager.config.dialogRootElement = dockManagerElement;
        dockManager.config.enableBrowserWindows = false;
        dockManager.initialize();
        dockManagerRef.current = dockManager;
        console.log("DockWorkspace: DockManager initialized");

        // Initialize DockMenuConnector
        const menuConnector = new DockMenuConnector(dockManager);
        setDockMenuConnector(menuConnector);
        console.log("DockWorkspace: DockMenuConnector created");

        // Register all available tool window panels with their metadata
        console.log("DockWorkspace: Registering panels...");
        menuConnector.registerPanel("sourceWindow", TOOL_WINDOW_TITLES.source, "Source code view");
        menuConnector.registerPanel("localsWindow", TOOL_WINDOW_TITLES.locals, "Local variables");
        menuConnector.registerPanel("bpWindow", TOOL_WINDOW_TITLES.breakpoints, "Breakpoints");
        menuConnector.registerPanel("memoryWindow", TOOL_WINDOW_TITLES.memory, "Memory view");
        menuConnector.registerPanel("threadsWindow", TOOL_WINDOW_TITLES.threads, "Threads");
        menuConnector.registerPanel(
          "disassemblyWindow",
          TOOL_WINDOW_TITLES.disassembly,
          "Disassembly",
        );
        menuConnector.registerPanel("callstackWindow", TOOL_WINDOW_TITLES.callstack, "Call stack");
        menuConnector.registerPanel("registersWindow", TOOL_WINDOW_TITLES.registers, "Registers");
        menuConnector.registerPanel(
          "commandWindow",
          TOOL_WINDOW_TITLES.command,
          "GDB command line",
        );
        console.log(`DockWorkspace: Registered ${menuConnector.getPanelList().length} panels`);

        // Create PanelContainer instances for all registered panels
        console.log("DockWorkspace: Creating all windows from DOM...");
        menuConnector.createAllWindows();
        console.log(
          `DockWorkspace: Created ${menuConnector.getPanelList().length} window containers`,
        );

        setupLayoutListeners(dockManager);

        // Restore layout from workspace state
        let layoutRestored = false;
        const currentHost = workspaceState.hosts.find((h) => h.id === hostId);
        if (currentHost && workspaceState.hostLayouts[hostId]) {
          try {
            const layoutToRestore = selectLayoutForRestore(workspaceState.hostLayouts[hostId]);
            console.log(`DockWorkspace: layoutToRestore keys:`, Object.keys(layoutToRestore));
            // Only attempt to restore if layout has content
            if (Object.keys(layoutToRestore).length > 0) {
              const layoutJson = serializeLayout(layoutToRestore);
              console.log(
                `DockWorkspace: Attempting to restore layout with ${layoutJson.length} chars`,
              );
              await dockManager.loadState(layoutJson);
              layoutRestored = true;
              console.log(`DockWorkspace: Successfully restored layout for host ${hostId}`);
            } else {
              console.log(`DockWorkspace: No layout content to restore for host ${hostId}`);
            }
          } catch (restoreError) {
            console.warn(
              `DockWorkspace: Failed to restore layout for host ${hostId}, using fallback`,
              restoreError,
            );
          }
        }

        // If layout restoration failed or no saved layout, create default
        if (!layoutRestored) {
          console.log(`DockWorkspace: Creating default layout for host ${hostId}`);
          console.log(`DockWorkspace: workspaceState.hostLayouts:`, workspaceState.hostLayouts);
          console.log(
            `DockWorkspace: workspaceState.hostLayouts[${hostId}]:`,
            workspaceState.hostLayouts[hostId],
          );
          // Try to load an empty state - dock-spawn-ts should auto-generate default
          // But wrap in try-catch in case it fails
          try {
            console.log(`DockWorkspace: Calling loadState with "{}"`);
            await dockManager.loadState("{}");
            console.log(`DockWorkspace: loadState succeeded with empty layout`);
          } catch (loadStateError) {
            // If even empty layout fails, just proceed - the dock manager should still work
            console.warn(
              `DockWorkspace: loadState("{}") failed, dock manager will use defaults:`,
              loadStateError,
            );
            // Don't rethrow - let dock-spawn-ts handle it with internal defaults
          }

          // Build a deterministic starter layout if nothing was restored.
          console.log("DockWorkspace: Building deterministic default panel layout...");
          buildDefaultLayout(dockManager, menuConnector);
        }

        // Reconcile panels with current layout
        console.log("DockWorkspace: Reconciling panels...");
        menuConnector.reconsilePanels();
        console.log(
          `DockWorkspace: Reconciled, current panel count: ${menuConnector.getPanelList().length}`,
        );

        // Dispatch events to update UI
        console.log("DockWorkspace: Dispatching update events...");
        window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
        resizeDockManager(dockManager);

        // Setup layout save listener
        const cleanupLayoutSaveListener = setupLayoutSaveListener(dockManager, hostId);

        const handleWindowResize = (): void => {
          resizeDockManager(dockManager);
          window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
        };

        window.addEventListener("resize", handleWindowResize);
        cleanupListenersRef.current = () => {
          window.removeEventListener("resize", handleWindowResize);
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

    // Cleanup on unmount
    return () => {
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
      setDockMenuConnector(null);
      // Note: We don't close dockManager here as the window may persist
      // Cleanup is handled by main process window lifecycle
    };
  }, [workspaceState, onError]);

  return (
    <div id="revealDockDiv" className="full-size">
      <div id="revealDockManager" className="revealDockManager"></div>
      <DockLayout />
    </div>
  );
}

export default DockWorkspace;
