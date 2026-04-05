/**
 * Main application component for RevealGDB.
 *
 * This component orchestrates the entire UI, including:
 * - Docking window system for debugger panels
 * - Application toolbar with window management
 * - Dialog windows (About, Settings, Connections)
 * - All GDB tool windows (Source, Locals, Registers, Memory, etc.)
 *
 * The app uses dock-spawn-ts for a flexible docking layout that can be
 * customized and persisted. The layout state is saved to settings and
 * restored on application restart.
 */

import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

import { JSX, RefObject, Suspense, lazy, useEffect, useRef } from "react";
import { GdbAny } from "../common/gdb-common";
import { AppTheme, applyTheme } from "./theme-manager";

/* Dialogs */
import type { AboutBoxHandle } from "./Dialogs/AboutBox";
import type { WhileConnectingDialogHandle } from "./Dialogs/ConnectionDialog.jsx";
import type { ConnectionManagerHandle } from "./Dialogs/ConnectionManager";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import type { SettingsHandle } from "./Dialogs/Settings.jsx";
import { ToolWindowErrorBoundary } from "./Errors/ToolWindowErrorBoundary";
import { ToolWindowsHostErrorBoundary } from "./Errors/ToolWindowsHostErrorBoundary";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import { TOOL_WINDOW_TITLES } from "./ToolWindows/toolWindowTitles";
import { DockMenuConnector } from "./utilities/DockMenuConnector.js";

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
 * Connector between the dock manager and the application menu system.
 * Manages panel registration and visibility toggling.
 */
export let dockMenuConnector: DockMenuConnector | null = null;

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
// @ts-expect-error the &asset messes up the type checking
import iconThread from "./icons/icons8-thread-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconRegister from "./icons/icons8-cpu-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconStack from "./icons/icons8-stack-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconHex from "./icons/icons8-hex-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconCmd from "./icons/icons8-command-line-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconSrc from "./icons/icons8-source-code-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconLocal from "./icons/icons8-local-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconDisa from "./icons/icons8-disassembly-48.png?asset";
// @ts-expect-error the &asset messes up the type checking
import iconBp from "./icons/icons8-dot-48.png?asset";

/* Application Version Info */
/**
 * Version information for the application and its dependencies.
 * Populated asynchronously from the main process and displayed in the About dialog.
 */
export let AppMainVersionInfo: Map<string, GdbAny>;

/**
 * Main application component.
 *
 * Initializes the docking layout, registers all tool windows, and sets up
 * event handlers for layout changes and window management. Also handles
 * dialog display requests from the main process.
 */
export default function App(): JSX.Element {
  // Refs for imperative access to child components
  const aboutBoxRef = useRef<AboutBoxHandle>(null);
  const settingsRef = useRef<SettingsHandle>(null);
  const connectionsRef = useRef<ConnectionManagerHandle>(null);
  const whileConnectingRef = useRef<WhileConnectingDialogHandle>(null);

  useEffect(() => {
    window.ipcToMain.queries.app.getVersionInfo().then((e) => {
      AppMainVersionInfo = e;
    });

    // Listen for commands from main process to show dialogs
    window.ipcToMain.notifications.render((msg: GdbAny) => {
      switch (msg.command) {
        case "about-box":
          aboutBoxRef.current?.ShowDialog();
          break;
        case "connections-dialog":
          connectionsRef.current?.ShowDialog();
          break;
        case "settings-dialog":
          settingsRef.current?.ShowDialog();
          break;
      }
    });

    const initializeDockManager = async (gdb: GdbAny): Promise<void> => {
      // Initialize the dock manager system
      const dockManagerElement = document.getElementById("revealDockManager")!;
      dockManager = new DockManager(dockManagerElement, { dialogRootElement: dockManagerElement });
      dockManager.initialize();

      // Create connector to manage panel registration and menu integration
      dockMenuConnector = new DockMenuConnector(dockManager);

      // Register all tool windows with the dock system
      // Parameters: elementId, displayName, title, iconClass
      dockMenuConnector.registerPanel(
        "sourceWindow",
        TOOL_WINDOW_TITLES.source,
        "Source Code Window",
        "wm-source",
      );
      dockMenuConnector.registerPanel(
        "localsWindow",
        TOOL_WINDOW_TITLES.locals,
        "Locals Variable Window",
        "wm-locals",
      );
      dockMenuConnector.registerPanel(
        "threadsWindow",
        TOOL_WINDOW_TITLES.threads,
        "Threads Window",
        "wm-thread",
      );
      dockMenuConnector.registerPanel(
        "callstackWindow",
        TOOL_WINDOW_TITLES.callstack,
        "Call Stack Window",
        "wm-stack",
      );
      dockMenuConnector.registerPanel(
        "memoryWindow",
        TOOL_WINDOW_TITLES.memory,
        "Memory Window",
        "wm-hex",
      );
      dockMenuConnector.registerPanel(
        "bpWindow",
        TOOL_WINDOW_TITLES.breakpoints,
        "Breakpoints Window",
        "wm-bp",
      );
      dockMenuConnector.registerPanel(
        "registersWindow",
        TOOL_WINDOW_TITLES.registers,
        "Registers Window",
        "wm-registers",
      );
      dockMenuConnector.registerPanel(
        "disassemblyWindow",
        TOOL_WINDOW_TITLES.disassembly,
        "Disassembly Window",
        "wm-disasm",
      );

      dockMenuConnector.registerPanel(
        "commandWindow",
        TOOL_WINDOW_TITLES.command,
        "GDB Command Window",
        "wm-command",
      );

      // Listen for docking layout changes to trigger saves and UI updates
      dockManager.addLayoutListener({
        onContainerResized: () => {
          window.dispatchEvent(new Event("update-window-list"));
          window.dispatchEvent(new Event("save-dock-layout"));
        },
        onTabChanged: () => {
          window.dispatchEvent(new Event("update-window-list"));
          window.dispatchEvent(new Event("save-dock-layout"));
        },
      });

      // Load saved layout or create default layout
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
        // Create default layout for first-time use
        const documentNode = dockManager.context.model.documentManagerNode;

        if (!dockMenuConnector) return;

        dockMenuConnector.createAllWindows();

        const srcNode = dockManager.dockFill(
          documentNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.source),
        );
        const cmdNode = dockManager.dockRight(
          srcNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.command),
          0.5,
        );
        const localsNode = dockManager.dockUp(
          cmdNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.locals),
          0.5,
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.threads),
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.callstack),
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.memory),
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.breakpoints),
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.registers),
        );
        dockManager.dockFill(
          localsNode,
          dockMenuConnector.getPanelByDisplayName(TOOL_WINDOW_TITLES.disassembly),
        );
      }
      // Synchronize panel state and trigger toolbar window list update
      dockMenuConnector.reconsilePanels();
      window.dispatchEvent(new Event("update-window-list"));

      // Trigger initial sizing only after dock manager exists.
      window.dispatchEvent(new Event("resize"));
    };

    // Load settings first so dock initialization can avoid race conditions.
    window.ipcToMain.queries.app.getSettings().then(async (gdb: GdbAny): Promise<void> => {
      // Apply saved theme before dock layout renders
      const savedTheme: AppTheme = gdb.gui?.applicationTheme ?? "Auto";
      applyTheme(savedTheme);

      await initializeDockManager(gdb);
    });

    // Handle live theme changes from the settings dialog
    const handleAppChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.theme) {
        applyTheme(detail.theme as AppTheme);
      }
    };
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

    // Handle window resize events to adjust dock layout
    const handleResize = () => {
      if (!dockMenuConnector) {
        return;
      }

      const divDockManager = document.getElementById("revealDockDiv")!;

      dockManager.resize(
        window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
        window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
      );
      window.dispatchEvent(new Event("save-dock-layout"));
    };

    window.addEventListener("resize", handleResize);

    dockMenuConnector?.reconsilePanels();

    // Trigger initial window list update
    window.dispatchEvent(new Event("update-window-list"));

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
      <div id="revealDockDiv" className="full-size">
        <div id="revealDockManager" className="revealDockManager"></div>
        <ToolWindowsHostErrorBoundary>
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
        </ToolWindowsHostErrorBoundary>
      </div>
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

  window.dispatchEvent(new Event("save-dock-layout"));
});

/**
 * Handle dock layout save requests.
 * Serializes the current layout and sends it to the main process for persistence.
 */
window.addEventListener("save-dock-layout", () => {
  if (!dockManager) {
    return;
  }

  const layout = JSON.parse(dockManager.saveState());
  window.ipcToMain.commands.app.notifyMain({ command: "save-dock-layout", data: layout });
});
