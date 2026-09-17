/**
 * Implements app for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `AppMainVersionInfo`, `App`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

import type { ComponentType, ForwardRefExoticComponent, RefAttributes } from "react";
import { JSX, MutableRefObject, RefObject, Suspense, lazy, useEffect, useRef } from "react";
import type { NotifyRenderMessage } from "../common/ipc-contracts";
import type { GdbSettings } from "../common/settings-types";
import type { Workspace, WorkspaceHost } from "../common/workspace-types";
import { AppTheme, applyTheme } from "./theme-manager";
import { setAppMainVersionInfo } from "./utilities/app-version-state";
import { filterWindowsForHost, getCurrentHostId } from "./utilities/multi-window-utils";

/* Dialogs */
import type { AboutBoxHandle } from "./Dialogs/AboutBox";
import { ConnectionDialog, WhileConnectingDialogHandle } from "./Dialogs/ConnectionDialog.jsx";
import { ConnectionManager, type ConnectionManagerHandle } from "./Dialogs/ConnectionManager";
import type { SectionsViewHandle } from "./Dialogs/SectionsView";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import { WorkspacePanel } from "./Components/WorkspacePanel";
import type { SettingsHandle } from "./Dialogs/Settings.jsx";
import { ToolWindowErrorBoundary } from "./Errors/ToolWindowErrorBoundary";
import { ToolWindowsHostErrorBoundary } from "./Errors/ToolWindowsHostErrorBoundary";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import { TOOL_WINDOW_TITLES } from "./ToolWindows/toolWindowTitles";
import { DockMenuConnector } from "./utilities/DockMenuConnector.js";
import { sanitizeDockLayout } from "./utilities/dock-layout-sanitizer";
import { dockMenuConnector, setDockMenuConnector } from "./utilities/dock-menu-state";
import { SAVE_DOCK_LAYOUT, UPDATE_WINDOW_LIST } from "./utilities/renderer-events";

type DockGraphNode = {
  containerType: string;
  state: Record<string, unknown>;
  children: DockGraphNode[];
};

type DockLayoutState = {
  graphInfo: DockGraphNode;
  dialogsInfo?: Array<Record<string, unknown>>;
};

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
 * Helper function to create a debug logger for layout operations.
 *
 * @param msg - Message to log
 */
function createDebugLogger(msg: string): void {
  if (__REVEALGDB_DEBUG__) {
    console.log(msg);
    window.ipcToMain?.commands?.app?.instrumentationLog(msg);
  }
}

/* Phase 1: Pane context menus */
import { usePaneContextMenu, type PaneContextMenuOptions } from "./utilities/usePaneContextMenu";

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
  const log = createDebugLogger;

  // Debounce timer to prevent saving layout before dimensions are finalized
  let saveLayoutTimer: ReturnType<typeof setTimeout> | null = null;
  let resizeCount = 0;

  const debouncedSaveLayout = () => {
    if (saveLayoutTimer) {
      clearTimeout(saveLayoutTimer);
    }
    // Wait 1000ms after last resize event before saving to ensure layout is stable
    // and to prevent concurrent file write operations
    saveLayoutTimer = setTimeout(() => {
      log("[LAYOUT] Debounce timeout fired - saving layout after resize events");
      window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
      saveLayoutTimer = null;
    }, 1000);
  };

  dm.addLayoutListener({
    onContainerResized: () => {
      resizeCount++;
      log(`[LAYOUT] onContainerResized event #${resizeCount}`);

      // Log current panel dimensions
      const panels = dm.getPanels();
      panels.forEach((panel) => {
        log(`  Panel: ${panel.title}`);
      });

      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      debouncedSaveLayout();
    },
    onTabChanged: () => {
      log("[LAYOUT] onTabChanged event");
      window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
      debouncedSaveLayout();
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

  const log = createDebugLogger;

  log("[LAYOUT] Creating default layout");

  connector.createAllWindows();
  const documentNode = dm.context.model.documentManagerNode;
  log(`[LAYOUT] Document node created`);

  const srcNode = dm.dockFill(
    documentNode,
    connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.source),
  );
  log(`[LAYOUT] Source window docked at fill (left pane)`);

  const toolsNode = dm.dockRight(
    srcNode,
    connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.locals),
    0.5,
  );
  log(`[LAYOUT] Locals window docked right with 50% width split (top right pane)`);

  dm.dockDown(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.command), 0.5);
  log(`[LAYOUT] Command window docked down with 50% height split (bottom right pane)`);

  // Log panel dimensions before filling
  const panels = dm.getPanels();
  panels.forEach((panel) => {
    log(`  Before fill - ${panel.title}`);
  });

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.threads));
  log(`[LAYOUT] Threads docked into tools pane`);

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.callstack));
  log(`[LAYOUT] Callstack docked into tools pane`);

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.memory));
  log(`[LAYOUT] Memory docked into tools pane`);

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.breakpoints));
  log(`[LAYOUT] Breakpoints docked into tools pane`);

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.registers));
  log(`[LAYOUT] Registers docked into tools pane`);

  dm.dockFill(toolsNode, connector.getPanelByDisplayName(TOOL_WINDOW_TITLES.disassembly));
  log(`[LAYOUT] Disassembly docked into tools pane`);

  // Log final panel dimensions
  const finalPanels = dm.getPanels();
  finalPanels.forEach((panel) => {
    log(`  After layout - ${panel.title}`);
  });

  log("[LAYOUT] Default layout creation complete");
}

function hasUsableWorkspaceLayout(layout: unknown): layout is Record<string, unknown> {
  return !!layout && typeof layout === "object" && Object.keys(layout).length > 0;
}

function cloneLayout<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getCurrentHostLayout(): DockLayoutState | null {
  if (!dockManager) {
    return null;
  }

  return JSON.parse(dockManager.saveState()) as DockLayoutState;
}

function createPanelNode(panelElementId: string, width: number, height: number): DockGraphNode {
  return {
    containerType: "panel",
    state: {
      element: panelElementId,
      width,
      height,
      canUndock: true,
      hideCloseButton: true,
      panelType: "panel",
    },
    children: [],
  };
}

function createEmptyHostLayoutState(width: number, height: number): DockLayoutState {
  return {
    graphInfo: {
      containerType: "fill",
      state: {
        width,
        height,
      },
      children: [],
    },
    dialogsInfo: [],
  };
}

function findFirstFillNode(node: DockGraphNode): DockGraphNode | null {
  if (node.containerType === "fill") {
    return node;
  }

  for (const child of node.children) {
    const match = findFirstFillNode(child);
    if (match) {
      return match;
    }
  }

  return null;
}

function removePanelNode(node: DockGraphNode, panelElementId: string): DockGraphNode | null {
  if (node.containerType === "panel") {
    return node.state.element === panelElementId ? null : node;
  }

  const nextChildren = node.children
    .map((child) => removePanelNode(child, panelElementId))
    .filter((child): child is DockGraphNode => child !== null);

  if (nextChildren.length === 0) {
    return {
      ...node,
      children: [],
    };
  }

  if (nextChildren.length === 1 && node.containerType !== "fill") {
    return nextChildren[0];
  }

  return {
    ...node,
    children: nextChildren,
  };
}

function insertPanelIntoHostLayout(
  existingLayout: Record<string, unknown> | undefined,
  panelElementId: string,
  width: number,
  height: number,
): DockLayoutState {
  const baseLayout = hasUsableWorkspaceLayout(existingLayout)
    ? cloneLayout(existingLayout as DockLayoutState)
    : createEmptyHostLayoutState(width, height);

  const graphInfo = baseLayout.graphInfo || createEmptyHostLayoutState(width, height).graphInfo;
  const firstFillNode = findFirstFillNode(graphInfo) || graphInfo;
  const hasPanelAlready = JSON.stringify(graphInfo).includes(`"element":"${panelElementId}"`);

  if (!hasPanelAlready) {
    firstFillNode.children = firstFillNode.children || [];
    firstFillNode.children.push(createPanelNode(panelElementId, width, height));
  }

  baseLayout.graphInfo = graphInfo;
  baseLayout.dialogsInfo = [];
  return baseLayout;
}

async function applyHostLayoutToDockManager(
  layout: Record<string, unknown> | undefined,
): Promise<void> {
  if (!dockManager) {
    return;
  }

  if (!hasUsableWorkspaceLayout(layout)) {
    return;
  }

  await dockManager.loadState(JSON.stringify(layout));
  dockMenuConnector?.reconsilePanels();
  window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
}

async function initializeDockManager(_gdb: GdbSettings): Promise<void> {
  const log = createDebugLogger;
  const currentHostId = getCurrentHostId();
  let workspaceLayout: unknown;

  try {
    const workspace = await window.ipcToMain.queries.workspace.getWorkspace();
    workspaceLayout = workspace.hostLayouts?.[currentHostId];
  } catch (error) {
    if (__REVEALGDB_DEBUG__) {
      console.warn("[INIT] Failed to load workspace host layout, falling back to default", error);
    }
  }

  log("[INIT] Initializing DockManager");
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
  setupLayoutListeners(dockManager);
  let loadedFromState = false;
  if (hasUsableWorkspaceLayout(workspaceLayout)) {
    try {
      log("[INIT] Attempting to load saved workspace host layout");
      // loadState is async in dock-spawn-ts; must await before resizing or
      // all panels stay hidden (resize fires before deserialization completes).
      await dockManager.loadState(JSON.stringify(workspaceLayout));
      loadedFromState = true;
      log("[INIT] Successfully loaded saved workspace host layout");
    } catch (e) {
      // Saved host layout is corrupt or incompatible — fall through to the hard-coded default.
      console.warn(
        "[INIT] dock-spawn-ts: failed to restore workspace host layout, using default",
        e,
      );
    }
  } else {
    log("[INIT] No usable workspace host layout found, will create default");
  }
  if (!loadedFromState) {
    if (currentHostId === "main") {
      log("[INIT] Creating default layout");
      createDefaultLayout(dockManager, dockMenuConnector);
    } else {
      log("[INIT] Leaving satellite host empty until panels are assigned");
    }
  }
  dockMenuConnector.reconsilePanels();
  window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
  log("[INIT] Triggering initial resize");
  // Trigger initial sizing only after dock manager exists.
  window.dispatchEvent(new Event("resize"));
}

function getWorkspaceWindowForCurrentHost(
  workspace: Workspace | null,
): Workspace["windows"][number] | undefined {
  if (!workspace) {
    return undefined;
  }

  const currentHostId = getCurrentHostId();
  return workspace.windows.find(
    (workspaceWindow) => (workspaceWindow.hostId || workspaceWindow.id || "main") === currentHostId,
  );
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
      <ConnectionManager ref={connectionsRef} />
      <ConnectionDialog ref={whileConnectingRef} connectionsRef={connectionsRef} />
      <Suspense fallback={null}>
        <SectionsView ref={sectionsViewRef} />
      </Suspense>
    </>
  );
}

/**
 * Set up dialog message handlers from main process
 */
function setupDialogHandlers(
  aboutBoxRef: RefObject<AboutBoxHandle | null>,
  settingsRef: RefObject<SettingsHandle | null>,
  connectionsRef: RefObject<ConnectionManagerHandle | null>,
  whileConnectingRef: RefObject<WhileConnectingDialogHandle | null>,
  sectionsViewRef: RefObject<SectionsViewHandle | null>,
): void {
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
      case "create-new-window":
        window.ipcToMain.commands.workspace.createHost({ label: "New Window" }).catch((error) => {
          console.error("Failed to create new window:", error);
        });
        break;
    }
  });
}

function setupKeyboardShortcuts(
  connectionsRef: RefObject<ConnectionManagerHandle | null>,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey && event.shiftKey)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const isTextInput =
      !!target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);

    if (isTextInput) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "c") {
      event.preventDefault();
      connectionsRef.current?.ShowDialog();
      return;
    }

    if (key === "n") {
      event.preventDefault();
      void window.ipcToMain.commands.workspace.createHost({ label: "New Window" });
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}

/**
 * Set up workspace synchronization listener
 */
function setupWorkspaceSync(
  workspaceRef: RefObject<Workspace | null>,
  appliedLayoutRef: MutableRefObject<string | null>,
): (() => void) | undefined {
  const currentHostId = getCurrentHostId();
  void window.ipcToMain.queries.workspace
    .getWorkspace()
    .then((workspace) => {
      workspaceRef.current = workspace;
      const hostLayout = workspace.hostLayouts?.[currentHostId];
      appliedLayoutRef.current = hasUsableWorkspaceLayout(hostLayout)
        ? JSON.stringify(hostLayout)
        : null;
    })
    .catch((error) => {
      if (__REVEALGDB_DEBUG__) {
        console.warn("[workspace-update] Failed to load initial workspace snapshot", error);
      }
    });

  return window.ipcToMain.notifications.workspaceUpdated?.((workspace: Workspace) => {
    workspaceRef.current = workspace;

    if (workspace.windows) {
      const hostWindows = filterWindowsForHost(workspace.windows, currentHostId);
      if (__REVEALGDB_DEBUG__) {
        console.log(`[workspace-update] Host '${currentHostId}' has ${hostWindows.length} windows`);
      }
    }

    const hostLayout = workspace.hostLayouts?.[currentHostId];
    const nextAppliedLayout = hasUsableWorkspaceLayout(hostLayout)
      ? JSON.stringify(hostLayout)
      : null;
    if (nextAppliedLayout && nextAppliedLayout !== appliedLayoutRef.current) {
      appliedLayoutRef.current = nextAppliedLayout;
      void applyHostLayoutToDockManager(hostLayout).catch((error) => {
        console.error(`Failed to apply host layout for ${currentHostId}:`, error);
      });
    }
  });
}

/**
 * Initialize dock manager and restore state
 */
function initializeDockAndRestore(): void {
  window.ipcToMain.queries.app.getSettings().then(async (gdb: GdbSettings): Promise<void> => {
    const savedTheme = (gdb.gui?.applicationTheme ?? "Auto") as AppTheme;
    applyTheme(savedTheme);
    await initializeDockManager(gdb);
  });
}

/**
 * Set up theme change listener
 */
function setupThemeSync(): (() => void) | undefined {
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
 * Create pane context menu options for floating/docking windows
 */
// eslint-disable-next-line max-lines-per-function
function createPaneContextMenuOptions(
  workspaceRef: MutableRefObject<Workspace | null>,
  connectionsRef: RefObject<ConnectionManagerHandle | null>,
  appliedLayoutRef: MutableRefObject<string | null>,
): PaneContextMenuOptions {
  const getMoveTargets = (): WorkspaceHost[] => {
    const currentHostId = getCurrentHostId();
    return (workspaceRef.current?.hosts || []).filter((host) => host.id !== currentHostId);
  };

  return {
    onFloatPane: async (panelTitle: string) => {
      if (!workspaceRef.current) return;

      const dockableWindow = workspaceRef.current.groups
        .flatMap((group) => group.windows)
        .find((window) => window.title === panelTitle);

      if (dockableWindow) {
        try {
          const currentLayout = getCurrentHostLayout();
          if (!currentLayout) {
            return;
          }

          const nextCurrentGraph = removePanelNode(
            currentLayout.graphInfo,
            panelElementIdForTitle(panelTitle),
          );
          const dockWidth = document.getElementById("revealDockManager")?.clientWidth || 1200;
          const dockHeight = document.getElementById("revealDockManager")?.clientHeight || 800;
          const nextCurrentLayout: DockLayoutState = {
            graphInfo:
              nextCurrentGraph || createEmptyHostLayoutState(dockWidth, dockHeight).graphInfo,
            dialogsInfo: [],
          };

          const result = await window.ipcToMain.commands.workspace.floatWindow(dockableWindow.id);
          const floatingWindow = result.windows.find(
            (workspaceWindow) =>
              workspaceWindow.type === "floating" && workspaceWindow.id === dockableWindow.id,
          );
          if (!floatingWindow) {
            return;
          }

          const floatingLayout = insertPanelIntoHostLayout(
            undefined,
            panelElementIdForTitle(panelTitle),
            dockWidth,
            dockHeight,
          );

          await window.ipcToMain.commands.workspace.saveHostLayout({
            hostId: getCurrentHostId(),
            layout: nextCurrentLayout,
          });
          await window.ipcToMain.commands.workspace.saveHostLayout({
            hostId: floatingWindow.id,
            layout: floatingLayout,
          });

          appliedLayoutRef.current = JSON.stringify(nextCurrentLayout);
          await applyHostLayoutToDockManager(nextCurrentLayout);
        } catch (error) {
          console.error(`Failed to float window ${dockableWindow.id}:`, error);
        }
      }
    },
    onDockPane: async (panelTitle: string) => {
      if (!workspaceRef.current) return;

      const dockableWindow = workspaceRef.current.groups
        .flatMap((group) => group.windows)
        .find((window) => window.title === panelTitle);

      if (!dockableWindow) {
        return;
      }

      const floatingWindow = workspaceRef.current.windows.find(
        (workspaceWindow) =>
          workspaceWindow.type === "floating" && workspaceWindow.id === getCurrentHostId(),
      );

      if (floatingWindow && floatingWindow.type === "floating") {
        const currentLayout = getCurrentHostLayout();
        if (!currentLayout) {
          return;
        }

        const dockWidth = document.getElementById("revealDockManager")?.clientWidth || 1200;
        const dockHeight = document.getElementById("revealDockManager")?.clientHeight || 800;
        const nextMainLayout = insertPanelIntoHostLayout(
          workspaceRef.current.hostLayouts?.main,
          panelElementIdForTitle(panelTitle),
          dockWidth,
          dockHeight,
        );

        try {
          await window.ipcToMain.commands.workspace.saveHostLayout({
            hostId: "main",
            layout: nextMainLayout,
          });
          await window.ipcToMain.commands.workspace.dockWindow(floatingWindow.id, "main");
        } catch (error) {
          console.error(`Failed to dock window ${floatingWindow.id}:`, error);
        }
      }
    },
    onSplitPane: async (panelTitle: string, direction: "horizontal" | "vertical") => {
      if (!workspaceRef.current) return;

      const dockableWindow = workspaceRef.current.groups
        .flatMap((group) => group.windows)
        .find((window) => window.title === panelTitle);

      if (!dockableWindow) {
        return;
      }

      try {
        await window.ipcToMain.commands.workspace.splitPane(dockableWindow.id, direction);
      } catch (error) {
        console.error(`Failed to split pane for ${dockableWindow.id}:`, error);
      }
    },
    onOpenConnections: () => {
      connectionsRef.current?.ShowDialog();
    },
    onCreateWindow: () => {
      void window.ipcToMain.commands.workspace.createHost({ label: "New Window" });
    },
    isPanelFloating: () =>
      getWorkspaceWindowForCurrentHost(workspaceRef.current)?.type === "floating",
    getMoveTargets: () => getMoveTargets().map((host) => ({ hostId: host.id, label: host.label })),
    onMoveToHost: async (panelTitle: string, targetHostId: string) => {
      const currentWorkspace = workspaceRef.current;
      const connector = dockMenuConnector;
      if (!currentWorkspace || !connector) {
        return;
      }

      const panelElementId = panelElementIdForTitle(panelTitle);
      if (!panelElementId) {
        console.error(`Failed to resolve panel element for '${panelTitle}'`);
        return;
      }

      const currentHostId = getCurrentHostId();
      const currentLayout = getCurrentHostLayout();
      if (!currentLayout) {
        return;
      }

      const nextCurrentGraph = removePanelNode(currentLayout.graphInfo, panelElementId);
      const dockWidth = document.getElementById("revealDockManager")?.clientWidth || 1200;
      const dockHeight = document.getElementById("revealDockManager")?.clientHeight || 800;
      const nextCurrentLayout: DockLayoutState = {
        graphInfo: nextCurrentGraph || createEmptyHostLayoutState(dockWidth, dockHeight).graphInfo,
        dialogsInfo: [],
      };
      const nextTargetLayout = insertPanelIntoHostLayout(
        currentWorkspace.hostLayouts?.[targetHostId],
        panelElementId,
        dockWidth,
        dockHeight,
      );

      try {
        await window.ipcToMain.commands.workspace.saveHostLayout({
          hostId: currentHostId,
          layout: nextCurrentLayout,
        });
        await window.ipcToMain.commands.workspace.saveHostLayout({
          hostId: targetHostId,
          layout: nextTargetLayout,
        });
        await window.ipcToMain.commands.workspace.openHost({ hostId: targetHostId });
        appliedLayoutRef.current = JSON.stringify(nextCurrentLayout);
        await applyHostLayoutToDockManager(nextCurrentLayout);
      } catch (error) {
        console.error(`Failed to move panel '${panelTitle}' to host '${targetHostId}':`, error);
      }
    },
  };
}

function panelElementIdForTitle(panelTitle: string): string | undefined {
  return dockMenuConnector?.getDockPanelInfoByDisplayName(panelTitle)?.id;
}

/**
 * Custom hook to create refs for App component
 */
function useAppRefs() {
  return {
    aboutBoxRef: useRef<AboutBoxHandle>(null),
    settingsRef: useRef<SettingsHandle>(null),
    connectionsRef: useRef<ConnectionManagerHandle>(null),
    whileConnectingRef: useRef<WhileConnectingDialogHandle>(null),
    sectionsViewRef: useRef<SectionsViewHandle>(null),
    workspaceRef: useRef<Workspace | null>(null),
    appliedLayoutRef: useRef<string | null>(null),
  };
}

/**
 * Render the main app UI
 */
function renderAppUI(
  connectionsRef: RefObject<ConnectionManagerHandle | null>,
  whileConnectingRef: RefObject<WhileConnectingDialogHandle | null>,
  settingsRef: RefObject<SettingsHandle | null>,
  aboutBoxRef: RefObject<AboutBoxHandle | null>,
  sectionsViewRef: RefObject<SectionsViewHandle | null>,
): JSX.Element {
  return (
    <div className={"main-page-container"}>
      <RevealToolbar
        connectionsRef={connectionsRef}
        whileConnectingRef={whileConnectingRef}
        settingsRef={settingsRef}
      />
      <DockLayout />
      {__REVEALGDB_DEBUG__ && (
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            width: "350px",
            zIndex: 9999,
          }}
        >
          <WorkspacePanel isVisible={true} />
        </div>
      )}
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
 * Performs app as part of this module's public API.
 *
 * @remarks
 * Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @returns The computed result produced by this operation.
 */
export default function App(): JSX.Element {
  const {
    aboutBoxRef,
    settingsRef,
    connectionsRef,
    whileConnectingRef,
    sectionsViewRef,
    workspaceRef,
    appliedLayoutRef,
  } = useAppRefs();

  // Set up pane context menu handlers
  usePaneContextMenu(createPaneContextMenuOptions(workspaceRef, connectionsRef, appliedLayoutRef));

  useEffect(() => {
    window.ipcToMain.queries.app.getVersionInfo().then((e) => {
      setAppMainVersionInfo(e);
    });

    setupDialogHandlers(
      aboutBoxRef,
      settingsRef,
      connectionsRef,
      whileConnectingRef,
      sectionsViewRef,
    );
    const unsubWorkspace = setupWorkspaceSync(workspaceRef, appliedLayoutRef);
    initializeDockAndRestore();
    const unsubTheme = setupThemeSync();
    const removeKeyboardShortcuts = setupKeyboardShortcuts(connectionsRef);

    window.addEventListener("changeApplication", handleAppChange);
    window.addEventListener("resize", handleResize);
    dockMenuConnector?.reconsilePanels();
    window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("changeApplication", handleAppChange);
      removeKeyboardShortcuts();
      if (unsubTheme) unsubTheme();
      if (unsubWorkspace) unsubWorkspace();
    };
  }, [
    aboutBoxRef,
    appliedLayoutRef,
    connectionsRef,
    sectionsViewRef,
    settingsRef,
    whileConnectingRef,
    workspaceRef,
  ]);

  return renderAppUI(connectionsRef, whileConnectingRef, settingsRef, aboutBoxRef, sectionsViewRef);
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
 */
window.addEventListener(SAVE_DOCK_LAYOUT, () => {
  const log = createDebugLogger;

  if (!dockManager) {
    log("[SAVE] No dockManager available");
    return;
  }

  log("[SAVE] Saving dock layout");
  const layout = JSON.parse(dockManager.saveState());
  log("[SAVE] Raw layout before sanitization: " + JSON.stringify(layout).substring(0, 200) + "...");

  const sanitizedLayout = sanitizeDockLayout(layout) as Record<string, unknown>;
  log("[SAVE] Sanitized layout: " + JSON.stringify(sanitizedLayout).substring(0, 200) + "...");

  // Log specific command window dimensions
  const findCommandWindow = (
    node: Record<string, unknown> | undefined,
  ): Record<string, unknown> | null => {
    if (
      node &&
      typeof node === "object" &&
      (node as Record<string, unknown>).state &&
      typeof (node as Record<string, unknown>).state === "object"
    ) {
      const state = (node as Record<string, unknown>).state as Record<string, unknown>;
      if (state.element === "commandWindow") {
        log(`[SAVE] Found command window: width=${state.width}, height=${state.height}`);
        return node as Record<string, unknown>;
      }
    }
    if (node && Array.isArray((node as Record<string, unknown>).children)) {
      for (const child of (node as Record<string, unknown>).children as Array<
        Record<string, unknown> | undefined
      >) {
        const result = findCommandWindow(child);
        if (result) return result;
      }
    }
    return null;
  };

  const cmdWindow = findCommandWindow(
    (sanitizedLayout as Record<string, Record<string, unknown> | undefined>).graphInfo,
  );
  if (!cmdWindow) {
    log("[SAVE] Command window NOT found in layout");
    // Continue anyway, the command window may not be in this layout version
  }

  void window.ipcToMain.commands.workspace
    .saveHostLayout({ hostId: getCurrentHostId(), layout: sanitizedLayout })
    .catch((error: unknown) => {
      console.error("Failed to save host layout:", error);
    });
});
