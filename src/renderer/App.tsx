import { DockviewApi, DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from "dockview";
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

import { fRendered } from "./main";
import RevealToolbar from "./Components/Toolbar";

let dockView: DockviewApi | null = null;

export let AppMainVersionInfo: Map<string, GdbAny>;
window.ipcToMain.getVersionInfo().then((e) => {
  AppMainVersionInfo = e;
});

export default class App extends Component {
  private aboutBoxRef = createRef<AboutBox>();
  private settingsRef = createRef<Settings>();
  private connectionsRef = createRef<ConnectionManager>();

  private disposable: ReturnType<DockviewApi["onDidLayoutChange"]> | null = null;

  private readonly components = {
    sourcewin: (props: IDockviewPanelProps) => <GdbSourceWindow {...(props as GdbAny)} />,
    localswin: (props: IDockviewPanelProps) => <GdbLocalsWindow {...(props as GdbAny)} />,
    breakpointwin: (props: IDockviewPanelProps) => <GdbBreakPointWindow {...(props as GdbAny)} />,
    callstackwin: (props: IDockviewPanelProps) => <GdbCallStackWindow {...(props as GdbAny)} />,
    commandwin: (props: IDockviewPanelProps) => <GdbCommandWindow {...(props as GdbAny)} />,
    memorywin: (props: IDockviewPanelProps) => <GdbMemoryWindow {...(props as GdbAny)} />,
    registerwin: (props: IDockviewPanelProps) => <GdbRegistersWindow {...(props as GdbAny)} />,
    threadswin: (props: IDockviewPanelProps) => <GdbThreadsWindow {...(props as GdbAny)} />,
  };

  override componentDidMount() {
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
      }
    });

    window.onresize = () => {
      if (fRendered) {
        this.saveDockLayout();
      }
    };

    window.addEventListener("beforeunload", () => {
      console.log("******************************************");
      console.log("Unloading Browser Window");
      console.log("******************************************");
      this.saveDockLayout();
    });
  }

  override componentWillUnmount() {
    if (this.disposable) {
      this.disposable.dispose();
    }
  }

  private onReady = (event: DockviewReadyEvent) => {
    dockView = event.api;

    this.disposable = event.api.onDidLayoutChange(() => {
      this.saveDockLayout();
    });

    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.dockLayout) {
        if (Object.keys(gdb.gui.dockLayout.panels).length === 0) {
          this.DefaultLayout(event);
        } else {
          event.api.fromJSON(gdb.gui.dockLayout);
        }
      } else {
        this.DefaultLayout(event);
      }
    });
  };

  private DefaultLayout(event: DockviewReadyEvent) {
    event.api.addPanel({
      id: "srcwin",
      component: "sourcewin",
      title: "Source",
    });
    event.api.addPanel({
      id: "locwin",
      component: "localswin",
      title: "Locals",
      position: {
        direction: "right",
        referencePanel: "srcwin",
      },
    });
    event.api.addPanel({
      id: "memwin",
      component: "memorywin",
      title: "Memory",
      position: {
        //   direction: "below",
        referencePanel: "locwin",
      },
    });
    event.api.addPanel({
      id: "regwin",
      component: "registerwin",
      title: "Registers",
      position: {
        // direction: "below",
        referencePanel: "locwin",
      },
    });
    event.api.addPanel({
      id: "brkptwin",
      component: "breakpointwin",
      title: "Breakpoints",
      position: {
        // direction: "below",
        referencePanel: "locwin",
      },
    });
    event.api.addPanel({
      id: "callstkwin",
      component: "callstackwin",
      title: "Call Stack",
      position: {
        // direction: "below",
        referencePanel: "locwin",
      },
    });
    event.api.addPanel({
      id: "thrdwin",
      component: "threadswin",
      title: "Threads",
      position: {
        // direction: "below",
        referencePanel: "locwin",
      },
    });
    event.api.addPanel({
      id: "cmdwin",
      component: "commandwin",
      title: "GDB Command",
      position: {
        direction: "below",
        referencePanel: "thrdwin",
      },
    });
  }

  override render() {
    return (
      <div className={"main-page-container"}>
        <RevealToolbar
          connectionsRef={this.connectionsRef as RefObject<ConnectionManager>}
          settingsRef={this.settingsRef as RefObject<Settings>}
        />
        <DockviewReact
          className={"dockview-theme-abyss"}
          onReady={this.onReady}
          components={this.components}
        />
        <AboutBox ref={this.aboutBoxRef} />
        <Settings ref={this.settingsRef} />
        <ConnectionManager ref={this.connectionsRef} />
      </div>
    );
  }

  private saveDockLayout() {
    const layout = dockView?.toJSON();
    window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
  }
}

window.addEventListener("beforeunload", () => {
  console.log("******************************************");
  console.log("Unloading Browser Window");
  console.log("******************************************");

  saveDockLayout();
});

function saveDockLayout() {
  const layout = dockView?.toJSON();
  window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
}
