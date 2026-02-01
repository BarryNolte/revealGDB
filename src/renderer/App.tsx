import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";

import { Component, createRef, JSX, RefObject } from "react";
import { GdbAny } from "../common/gdb-common";

/* Dialogs */
import { AboutBox } from "./Dialogs/AboutBox";
import { ConnectionManager } from "./Dialogs/ConnectionManager";
import { Settings } from "./Dialogs/Settings";

/* Tool Windows */
import RevealToolbar from "./Components/Toolbar.jsx";
import GdbBreakPointWindow from "./ToolWindows/GdbBreakpointsWindow";
import GdbCallStackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";
import { DockMenuConnector } from "./utilities/DockMenuConnector.js";

/* Dock Manager */
let dockManager: DockManager;
export let dockMenuConnector: DockMenuConnector | null = null;

/* Icons Assets */
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
import iconBp from "./icons/icons8-dot-48.png?asset";

/* Application Version Info */
export let AppMainVersionInfo: Map<string, GdbAny>;
window.ipcToMain.getVersionInfo().then((e) => {
  AppMainVersionInfo = e;
});

export default class App extends Component {
  private toolbarRef = createRef<RevealToolbar>();
  private aboutBoxRef = createRef<AboutBox>();
  private settingsRef = createRef<Settings>();
  private connectionsRef = createRef<ConnectionManager>();

  override componentDidMount() {
    console.log("Application DidMount");
    window.ipcToMain.notifyRender((msg: GdbAny) => {
      switch (msg.command) {
        case "about-box":
          {
            this.aboutBoxRef.current?.ShowDialog();
          }
          break;
        case "connections-dialog":
          {
            this.connectionsRef.current?.ShowDialog();
          }
          break;
        case "settings-dialog":
          {
            this.settingsRef.current?.ShowDialog();
          }
          break;
        case "connection-started":
          {
            console.log(`Connection Started: ${Date.now()}`);
          }
          break;
        case "connection-success":
          {
            console.log(`Connection Success: ${Date.now()}`);
            dockManager.invalidate();
          }
          break;
        case "connection-failed":
          {
            console.log(`Connection Failed : ${Date.now()}`);
          }
          break;
      }
    });

    const dockManagerElement = document.getElementById("revealDockManager")!;
    dockManager = new DockManager(dockManagerElement, { dialogRootElement: dockManagerElement });
    dockManager.initialize();

    dockMenuConnector = new DockMenuConnector(dockManager);

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
    dockMenuConnector.registerPanel("commandWindow", "Command", "GDB Command Window", "wm-command");

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

    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.dockLayout) {
        dockManager.loadState(JSON.stringify(gdb.gui.dockLayout));
      } else {
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
      }
    });

    dockMenuConnector.reconsilePanels();
    this.toolbarRef.current?.FillWindowList();

    // Let the dock manager element fill in the entire screen
    window.onresize = function () {
      const divDockManager = document.getElementById("revealDockDiv")!;

      dockManager.resize(
        window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
        window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
      );
      window.dispatchEvent(new Event("save-dock-layout"));
    };
    window.dispatchEvent(new Event("resize"));
    dockMenuConnector?.reconsilePanels();

    // window.addEventListener("update-window-list", () => {
    //   this.toolbarRef.current?.FillWindowList();
    // });

    window.dispatchEvent(new Event("update-window-list"));
  }

  override render(): JSX.Element {
    return (
      <div className={"main-page-container"}>
        <RevealToolbar
          ref={this.toolbarRef}
          connectionsRef={this.connectionsRef as RefObject<ConnectionManager>}
          settingsRef={this.settingsRef as RefObject<Settings>}
        />
        <div id="revealDockDiv" className="full-size">
          <div id="revealDockManager" className="revealDockManager"></div>
          <div
            id="sourceWindow"
            data-panel-caption="Source"
            hidden={true}
            data-panel-icon={iconSrc}
          >
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
            id="commandWindow"
            data-panel-caption="Command"
            hidden={true}
            data-panel-icon={iconCmd}
          >
            <GdbCommandWindow />
          </div>
          <div
            id="memoryWindow"
            data-panel-caption="Memory"
            hidden={true}
            data-panel-icon={iconHex}
          >
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
          <div
            id="bpWindow"
            data-panel-caption="Breakpoints"
            hidden={true}
            data-panel-icon={iconBp}
          >
            <GdbBreakPointWindow />
          </div>
        </div>
        <AboutBox ref={this.aboutBoxRef} />
        <Settings ref={this.settingsRef} />
        <ConnectionManager ref={this.connectionsRef} />
      </div>
    );
  }
}

window.addEventListener("beforeunload", () => {
  console.log("******************************************");
  console.log("Before Unloading Browser Window");
  console.log("******************************************");

  window.dispatchEvent(new Event("save-dock-layout"));
});

window.addEventListener("save-dock-layout", () => {
  const layout = JSON.parse(dockManager.saveState());
  //console.log(layout);
  window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
});
