import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { DockviewApi, DockviewReact, DockviewReadyEvent } from "dockview";
import { GdbAny /*, wait */ } from "../common/gdb-common";

import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbBreakPointWindow from "./ToolWindows/GdbBreakpointsWindow";
import GdbCallStackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";
import { fRendered } from "./main";
import { useEffect, useState } from "react";

const components = {
  sourcewin: GdbSourceWindow,
  localswin: GdbLocalsWindow,
  breakpointwin: GdbBreakPointWindow,
  callstackwin: GdbCallStackWindow,
  commandwin: GdbCommandWindow,
  memorywin: GdbMemoryWindow,
  registerwin: GdbRegistersWindow,
  threadswin: GdbThreadsWindow,
};

let dockView: DockviewApi | null = null;

export default function App() {
  const [api, setApi] = useState<DockviewApi>();
  //wait(250);

  const onReady = (event: DockviewReadyEvent) => {
    setApi(event.api);
    dockView = event.api;

    window.ipcToMain.getSettings().then(async (gdb: GdbAny): Promise<void> => {
      console.log("Layout Loaded...");
      if (gdb.gui.dockLayout) {
        event.api.fromJSON(gdb.gui.dockLayout);
      } else {
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
    });
  };

  // Effect to save the layout on change
  useEffect(() => {
    if (!api) {
      return;
    }
    const disposable = api.onDidLayoutChange(() => {
      saveDockLayout();
    });

    // Clean up the event listener on component unmount
    return () => disposable?.dispose();
  }, [api]);

  return (
    <div className={"main-page-container"}>
      <ToolbarComponent id="toolbar">
        <ItemsDirective>
          <ItemDirective
            click={onContinue}
            prefixIcon="tb-icon tb-go"
            tooltipText="Continue"
            text="Continue"
          />
          <ItemDirective
            click={onPause}
            prefixIcon="tb-icon tb-pause"
            tooltipText="Pause"
            text="Pause"
          />
          <ItemDirective
            click={onStop}
            prefixIcon="tb-icon tb-stop"
            tooltipText="Stop"
            text="Stop"
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={onStepOver}
            prefixIcon="tb-icon tb-step-over"
            tooltipText="Step Over"
            text="Step Over"
          />
          <ItemDirective
            click={onStepIn}
            prefixIcon="tb-icon tb-step-in"
            tooltipText="Step In"
            text="Step In"
          />
          <ItemDirective
            click={onStepOut}
            prefixIcon="tb-icon tb-step-out"
            tooltipText="Step Out"
            text="Step Out"
          />
          <ItemDirective type="Separator" />
          <ItemDirective
            click={onConnectionManager}
            prefixIcon="tb-icon tb-connect"
            tooltipText="Connection Manager"
            text="Connections"
          />
        </ItemsDirective>
      </ToolbarComponent>
      <DockviewReact className={"dockview-theme-abyss"} onReady={onReady} components={components} />
    </div>
  );

  function onContinue() {
    window.ipcToMain.sendGdbCommand("continue");
  }

  function onPause() {
    window.ipcToMain.sendGdbCommand("signal SIGINT");
  }

  function onStop() {
    window.ipcToMain.sendGdbCommand("kill");
  }

  function onStepOver() {
    window.ipcToMain.sendGdbCommand("next");
  }

  function onStepIn() {
    window.ipcToMain.sendGdbCommand("step");
  }

  function onStepOut() {
    window.ipcToMain.sendGdbCommand("finish");
  }

  function onConnectionManager() {}
}

window.ipcToMain.getSettings().then(async (/*gdb: GdbAny*/): Promise<void> => {});

window.onresize = () => {
  if (fRendered) {
    saveDockLayout();
  }
};

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
