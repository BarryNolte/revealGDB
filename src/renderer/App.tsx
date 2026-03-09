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

import { JSX, RefObject, useEffect, useRef } from "react";
import { GdbAny } from "../common/gdb-common";

/* Dialogs */
import { AboutBox, type AboutBoxHandle } from "./Dialogs/AboutBox";
import { ConnectionDialog, type WhileConnectingDialogHandle } from "./Dialogs/ConnectionDialog.jsx";
import { ConnectionManager, type ConnectionManagerHandle } from "./Dialogs/ConnectionManager";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import Settings, { SettingsHandle } from "./Dialogs/Settings.jsx";
import GdbBreakPointWindow from "./ToolWindows/GdbBreakpointsWindow";
import GdbCallStackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbDisassemblerWindow from "./ToolWindows/GdbDisassemblerWindow.jsx";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";
import { DockMenuConnector } from "./utilities/DockMenuConnector.js";

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
window.ipcToMain.getVersionInfo().then((e) => {
  AppMainVersionInfo = e;
});

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
    // Listen for commands from main process to show dialogs
    window.ipcToMain.notifyRender((msg: GdbAny) => {
      switch (msg.command) {
        case "about-box":
          {
            aboutBoxRef.current?.ShowDialog();
          }
          break;
        case "connections-dialog":
          {
            connectionsRef.current?.ShowDialog();
          }
          break;
        case "settings-dialog":
          {
            settingsRef.current?.ShowDialog();
          }
          break;
      }
    });

    // Initialize the dock manager system
    const dockManagerElement = document.getElementById("revealDockManager")!;
    dockManager = new DockManager(dockManagerElement, { dialogRootElement: dockManagerElement });
    dockManager.initialize();

    // Create connector to manage panel registration and menu integration
    dockMenuConnector = new DockMenuConnector(dockManager);

    // Register all tool windows with the dock system
    // Parameters: elementId, displayName, title, iconClass
    dockMenuConnector.registerPanel("sourceWindow", "Source", "Source Code Window", "wm-source");
    dockMenuConnector.registerPanel(
      "localsWindow",
      "Locals",
      "Locals Variable Window",
      "wm-locals",
    );
    dockMenuConnector.registerPanel("threadsWindow", "Threads", "Threads Window", "wm-thread");
    dockMenuConnector.registerPanel(
      "callstackWindow",
      "Call Stack",
      "Call Stack Window",
      "wm-stack",
    );
    dockMenuConnector.registerPanel("memoryWindow", "Memory", "Memory Window", "wm-hex");
    dockMenuConnector.registerPanel("bpWindow", "Breakpoints", "Breakpoints Window", "wm-bp");
    dockMenuConnector.registerPanel(
      "registersWindow",
      "Registers",
      "Registers Window",
      "wm-registers",
    );
    dockMenuConnector.registerPanel(
      "disassemblyWindow",
      "Disassembly",
      "Disassembly Window",
      "wm-disasm",
    );

    dockMenuConnector.registerPanel("commandWindow", "Command", "GDB Command Window", "wm-command");

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
    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.dockLayout) {
        // Restore previously saved layout
        dockManager.loadState(JSON.stringify(gdb.gui.dockLayout));
      } else {
        // Create default layout for first-time use
        const documentNode = dockManager.context.model.documentManagerNode;

        if (!dockMenuConnector) return;

        dockMenuConnector.createAllWindows();

        const srcNode = dockManager.dockFill(
          documentNode,
          dockMenuConnector.getPanelByDisplayName("Source"),
        );
        const cmdNode = dockManager.dockRight(
          srcNode,
          dockMenuConnector.getPanelByDisplayName("Command"),
          0.5,
        );
        const localsNode = dockManager.dockUp(
          cmdNode,
          dockMenuConnector.getPanelByDisplayName("Locals"),
          0.5,
        );
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Threads"));
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Call Stack"));
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Memory"));
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Breakpoints"));
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Registers"));
        dockManager.dockFill(localsNode, dockMenuConnector.getPanelByDisplayName("Disassembly"));
      }
    });

    // Synchronize panel state and trigger toolbar window list update
    dockMenuConnector.reconsilePanels();
    window.dispatchEvent(new Event("update-window-list"));

    // Handle window resize events to adjust dock layout
    const handleResize = () => {
      const divDockManager = document.getElementById("revealDockDiv")!;

      dockManager.resize(
        window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
        window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
      );
      window.dispatchEvent(new Event("save-dock-layout"));
    };

    window.addEventListener("resize", handleResize);
    window.dispatchEvent(new Event("resize"));
    dockMenuConnector?.reconsilePanels();

    // Trigger initial window list update
    window.dispatchEvent(new Event("update-window-list"));

    // Cleanup function: remove event listeners on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
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
        <div id="sourceWindow" data-panel-caption="Source" hidden={true} data-panel-icon={iconSrc}>
          <GdbSourceWindow />
        </div>
        <div
          id="localsWindow"
          data-panel-caption="Locals"
          hidden={true}
          data-panel-icon={iconLocal}
        >
          <GdbLocalsWindow />
        </div>
        <div
          id="threadsWindow"
          data-panel-caption="Threads"
          data-panel-icon={iconThread}
          hidden={true}
        >
          <GdbThreadsWindow />
        </div>
        <div
          id="registersWindow"
          data-panel-caption="Registers"
          hidden={true}
          data-panel-icon={iconRegister}
        >
          <GdbRegistersWindow />
        </div>
        <div
          id="disassemblyWindow"
          data-panel-caption="Disassembly"
          hidden={true}
          data-panel-icon={iconDisa}
        >
          <GdbDisassemblerWindow />
        </div>
        <div
          id="commandWindow"
          data-panel-caption="Command"
          hidden={true}
          data-panel-icon={iconCmd}
        >
          <GdbCommandWindow />
        </div>
        <div id="memoryWindow" data-panel-caption="Memory" hidden={true} data-panel-icon={iconHex}>
          <GdbMemoryWindow />
        </div>
        <div
          id="callstackWindow"
          data-panel-caption="Call Stack"
          hidden={true}
          data-panel-icon={iconStack}
        >
          <GdbCallStackWindow />
        </div>
        <div id="bpWindow" data-panel-caption="Breakpoints" hidden={true} data-panel-icon={iconBp}>
          <GdbBreakPointWindow />
        </div>
      </div>
      <AboutBox ref={aboutBoxRef} />
      <Settings ref={settingsRef} />
      <ConnectionManager ref={connectionsRef} />
      <ConnectionDialog
        ref={whileConnectingRef}
        connectionsRef={connectionsRef as RefObject<ConnectionManagerHandle>}
      />
    </div>
  );
}

/**
 * Save dock layout before window unload.
 * Ensures user's window arrangement is preserved across sessions.
 */
window.addEventListener("beforeunload", () => {
  console.log("******************************************");
  console.log("Before Unloading Browser Window");
  console.log("******************************************");

  window.dispatchEvent(new Event("save-dock-layout"));
});

/**
 * Handle dock layout save requests.
 * Serializes the current layout and sends it to the main process for persistence.
 */
window.addEventListener("save-dock-layout", () => {
  const layout = JSON.parse(dockManager.saveState());
  window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
});
