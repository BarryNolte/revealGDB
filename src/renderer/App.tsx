import { DockManager } from "../../node_modules/dock-spawn-ts/lib/js/DockManager.js";
import { PanelContainer } from "../../node_modules/dock-spawn-ts/lib/js/PanelContainer.js";

import { Component, createRef, RefObject } from "react";
import { GdbAny } from "../common/gdb-common";

import GdbBreakPointWindow from "./ToolWindows/GdbBreakpointsWindow";
import GdbCallStackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";

import { AboutBox } from "./Dialogs/AboutBox";
import { ConnectionManager } from "./Dialogs/ConnectionManager";
import { Settings } from "./Dialogs/Settings";

//import { fRendered } from "./main";
import RevealToolbar from "./Components/Toolbar";

let dockManager: DockManager;

export let AppMainVersionInfo: Map<string, GdbAny>;
window.ipcToMain.getVersionInfo().then((e) => {
  AppMainVersionInfo = e;
});

export default class App extends Component {
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

    // Convert a div to a dock manager.  Panels can then be docked on to it
    dockManager = new DockManager(document.getElementById("revealDockManager")!);
    dockManager.initialize();

    const source = new PanelContainer(document.getElementById("sourceWindow")!, dockManager);
    const locals = new PanelContainer(document.getElementById("localsWindow")!, dockManager);
    const threads = new PanelContainer(document.getElementById("threadsWindow")!, dockManager);
    const callstack = new PanelContainer(document.getElementById("callstackWindow")!, dockManager);
    const memory = new PanelContainer(document.getElementById("memoryWindow")!, dockManager);
    const breakpoints = new PanelContainer(document.getElementById("bpWindow")!, dockManager);
    const registers = new PanelContainer(document.getElementById("registersWindow")!, dockManager);
    const command = new PanelContainer(document.getElementById("commandWindow")!, dockManager);

    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.dockLayout) {
        dockManager.loadState(JSON.stringify(gdb.gui.dockLayout));
      } else {
        const documentNode = dockManager.context.model.documentManagerNode;
        const commandNode = dockManager.dockFill(documentNode, command);
        const localsNode = dockManager.dockUp(commandNode, locals, 0.5);
        dockManager.dockFill(localsNode, threads);
        dockManager.dockFill(localsNode, callstack);
        dockManager.dockFill(localsNode, memory);
        dockManager.dockFill(localsNode, breakpoints);
        dockManager.dockFill(localsNode, registers);
        dockManager.dockLeft(localsNode, source, 0.5);
      }
    });

    dockManager.addLayoutListener({
      onClosePanel: (dockManager, panel) => {
        console.log(`onClosePanel(panel:'${panel?.title}')`);
        //localStorage.setItem(storeKey, dockManager.saveState());
        // updateState();
      },
    });

    // Let the dock manager element fill in the entire screen
    window.onresize = function () {
      const divDockManager = document.getElementById("revealDockDiv")!;

      dockManager.resize(
        window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
        window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
      );
    };
    window.dispatchEvent(new Event("resize"));
  }

  override componentWillUnmount() {
    saveDockLayout();
  }

  override render() {
    return (
      <div className={"main-page-container"}>
        <RevealToolbar
          connectionsRef={this.connectionsRef as RefObject<ConnectionManager>}
          settingsRef={this.settingsRef as RefObject<Settings>}
        />
        <div id="revealDockDiv" className="full-size">
          <div id="revealDockManager" className="revealDockManager"></div>
          <div
            id="sourceWindow"
            data-panel-caption="Source"
            className={"solution-window"}
            hidden={true}
          >
            <GdbSourceWindow />
          </div>
          <div
            id="localsWindow"
            data-panel-caption="Locals"
            className={"solution-window"}
            hidden={true}
          >
            <GdbLocalsWindow />
          </div>
          <div
            id="threadsWindow"
            data-panel-caption="Threads"
            className={"solution-window"}
            hidden={true}
          >
            <GdbThreadsWindow />
          </div>
          <div
            id="registersWindow"
            data-panel-caption="Registers"
            className={"solution-window"}
            hidden={true}
          >
            <GdbRegistersWindow />
          </div>
          <div
            id="commandWindow"
            data-panel-caption="Command"
            className={"solution-window"}
            hidden={true}
          >
            <GdbCommandWindow />
          </div>
          <div
            id="memoryWindow"
            data-panel-caption="Memory"
            className={"solution-window"}
            hidden={true}
          >
            <GdbMemoryWindow />
          </div>
          <div
            id="callstackWindow"
            data-panel-caption="Call Stack"
            className={"solution-window"}
            hidden={true}
          >
            <GdbCallStackWindow />
          </div>
          <div
            id="bpWindow"
            data-panel-caption="Breakpoints"
            className={"solution-window"}
            hidden={true}
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

  saveDockLayout();
});

function saveDockLayout() {
  const layout = JSON.parse(dockManager.saveState());
  console.log(layout);
  window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
}
