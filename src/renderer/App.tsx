import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { DockviewApi, DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from "dockview";
import React from "react";
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
import { fRendered } from "./main";

let dockView: DockviewApi | null = null;
export let AppMainVersionInfo: Map<string, GdbAny>;
window.ipcToMain.getVersionInfo().then((e) => (AppMainVersionInfo = e));

export default class App extends React.Component {
  private aboutBoxRef = React.createRef<AboutBox>();
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
      if (msg?.command === "about-box") {
        this.aboutBoxRef.current?.ShowDialog();
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

    //window.ipcToMain.getSettings().then(async (): Promise<void> => {});
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

    window.ipcToMain.getSettings().then(async (gdb: GdbAny): Promise<void> => {
      console.log("Layout Loaded...");
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
        <ToolbarComponent id="toolbar">
          <ItemsDirective>
            <ItemDirective
              click={this.onContinue}
              prefixIcon="tb-icon tb-go"
              tooltipText="Continue"
              text="Continue"
            />
            <ItemDirective
              click={this.onPause}
              prefixIcon="tb-icon tb-pause"
              tooltipText="Pause"
              text="Pause"
            />
            <ItemDirective
              click={this.onStop}
              prefixIcon="tb-icon tb-stop"
              tooltipText="Stop"
              text="Stop"
            />
            <ItemDirective type="Separator" />
            <ItemDirective
              click={this.onStepOver}
              prefixIcon="tb-icon tb-step-over"
              tooltipText="Step Over"
              text="Step Over"
            />
            <ItemDirective
              click={this.onStepIn}
              prefixIcon="tb-icon tb-step-in"
              tooltipText="Step In"
              text="Step In"
            />
            <ItemDirective
              click={this.onStepOut}
              prefixIcon="tb-icon tb-step-out"
              tooltipText="Step Out"
              text="Step Out"
            />
            <ItemDirective type="Separator" />
            <ItemDirective
              click={this.onConnectionManager}
              prefixIcon="tb-icon tb-connect"
              tooltipText="Connection Manager"
              text="Connections"
            />
          </ItemsDirective>
        </ToolbarComponent>
        <DockviewReact
          className={"dockview-theme-abyss"}
          onReady={this.onReady}
          components={this.components}
        />
        <AboutBox ref={this.aboutBoxRef} />
      </div>
    );
  }

  private onContinue = () => {
    window.ipcToMain.sendGdbCommand("continue");
  };

  private onPause = () => {
    window.ipcToMain.sendGdbCommand("signal SIGINT");
  };

  private onStop = () => {
    window.ipcToMain.sendGdbCommand("kill");
  };

  private onStepOver = () => {
    window.ipcToMain.sendGdbCommand("next");
  };

  private onStepIn = () => {
    window.ipcToMain.sendGdbCommand("step");
  };

  private onStepOut = () => {
    window.ipcToMain.sendGdbCommand("finish");
  };

  private onConnectionManager = () => {
    // TODO: implement connection manager
  };

  private saveDockLayout() {
    const layout = dockView?.toJSON();
    window.ipcToMain.notifyMain({ command: "save-dock-layout", data: layout });
  }
}

//window.ipcToMain.getSettings().then(async (/*gdb: GdbAny*/): Promise<void> => {});

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
