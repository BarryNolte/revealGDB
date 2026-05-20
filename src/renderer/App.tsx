/**
 * Implements app for revealGDB runtime behavior.
 *
 * @remarks
 * Exported symbols include `AppMainVersionInfo`, `App`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

import { JSX, RefObject, Suspense, lazy, useEffect, useRef } from "react";
import { GdbAny } from "../common/gdb-common";
import { AppTheme, applyTheme } from "./theme-manager";
import { setAppMainVersionInfo } from "./utilities/app-version-state";

/* Dialogs */
import type { AboutBoxHandle } from "./Dialogs/AboutBox";
import type { WhileConnectingDialogHandle } from "./Dialogs/ConnectionDialog.jsx";
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
import { SAVE_DOCK_LAYOUT, UPDATE_WINDOW_LIST } from "./utilities/renderer-events";

const AboutBox = lazy(() =>
  import("./Dialogs/AboutBox.js").then((module) => ({
    default: module.AboutBox as unknown as () => JSX.Element,
  })),
) as GdbAny;
const Settings = lazy(() =>
  import("./Dialogs/Settings.js").then((module) => ({
    default: module.default as unknown as () => JSX.Element,
  })),
) as GdbAny;
const ConnectionManager = lazy(() =>
  import("./Dialogs/ConnectionManager.js").then((module) => ({
    default: module.ConnectionManager as unknown as () => JSX.Element,
  })),
) as GdbAny;
const ConnectionDialog = lazy(() =>
  import("./Dialogs/ConnectionDialog.js").then((module) => ({
    default: module.ConnectionDialog as unknown as () => JSX.Element,
  })),
) as GdbAny;
const SectionsView = lazy(() =>
  import("./Dialogs/SectionsView.js").then((module) => ({
    default: module.SectionsView as unknown as () => JSX.Element,
  })),
) as GdbAny;
/**
 * Performs lazy window as part of this module's internal workflow.
 *
 * @remarks
 * Performs asynchronous work and should be used with completion ordering in mind.
 *
 * @param importer - Callback invoked when the associated event occurs.
 */
function lazyWindow(importer: () => Promise<GdbAny>) {
  return lazy(() =>
    importer().then((module: GdbAny) => ({
      default: module.default as () => JSX.Element,
    })),
  );
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
 * Performs deferred window as part of this module's internal workflow.
 *
 * @param param1 - Value for `param1` consumed by this operation.
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

function handleAppChange(e: Event): void {
  const detail = (e as CustomEvent).detail;
  if (detail?.theme) {
    applyTheme(detail.theme as AppTheme);
  }
}

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

async function initializeDockManager(gdb: GdbAny): Promise<void> {
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
  if (gdb.gui.dockLayout) {
    try {
      // loadState is async in dock-spawn-ts; must await before resizing or
      // all panels stay hidden (resize fires before deserialization completes).
      await dockManager.loadState(JSON.stringify(gdb.gui.dockLayout));
      loadedFromState = true;
    } catch (e) {
      // Saved layout is corrupt or incompatible — fall through to default layout.
      console.warn("dock-spawn-ts: failed to restore saved layout, using default", e);
    }
  }
  if (!loadedFromState) {
    createDefaultLayout(dockManager, dockMenuConnector);
  }
  dockMenuConnector.reconsilePanels();
  window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));
  // Trigger initial sizing only after dock manager exists.
  window.dispatchEvent(new Event("resize"));
}

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

  useEffect(() => {
    window.ipcToMain.queries.app.getVersionInfo().then((e) => {
      setAppMainVersionInfo(e);
    });

    // Listen for commands from main process to show dialogs
    window.ipcToMain.notifications.render((msg: GdbAny) => {
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

    // Load settings first so dock initialization can avoid race conditions.
    window.ipcToMain.queries.app.getSettings().then(async (gdb: GdbAny): Promise<void> => {
      // Apply saved theme before dock layout renders
      const savedTheme: AppTheme = gdb.gui?.applicationTheme ?? "Auto";
      applyTheme(savedTheme);
      await initializeDockManager(gdb);
    });

    window.addEventListener("changeApplication", handleAppChange);

    // Handle OS theme changes pushed from the main process (Auto mode)
    const unsubTheme = window.ipcToMain.notifications.themeChanged?.((data: GdbAny) => {
      // Re-apply the current user theme so Auto mode picks up the new OS state
      window.ipcToMain.queries.app.getSettings().then((gdb: GdbAny) => {
        const currentTheme: AppTheme = gdb.gui?.applicationTheme ?? "Auto";
        if (currentTheme === "Auto") {
          applyTheme("Auto", data?.shouldUseDarkColors ?? false);
        }
      });
    });

    window.addEventListener("resize", handleResize);
    dockMenuConnector?.reconsilePanels();
    window.dispatchEvent(new Event(UPDATE_WINDOW_LIST));

    // Cleanup function: remove event listeners on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("changeApplication", handleAppChange);
      if (unsubTheme) unsubTheme();
    };
  }, []);

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
 */
window.addEventListener(SAVE_DOCK_LAYOUT, () => {
  if (!dockManager) {
    return;
  }

  const layout = JSON.parse(dockManager.saveState());
  window.ipcToMain.commands.app.notifyMain({ command: "save-dock-layout", data: layout });
});
