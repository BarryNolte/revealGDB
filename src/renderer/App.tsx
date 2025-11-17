import { ItemDirective, ItemsDirective, ToolbarComponent } from "@syncfusion/ej2-react-navigations";
import { DockviewReact, DockviewReadyEvent, IDockviewPanelProps } from "dockview";
import { GdbAny } from "../common/gdb-common";

import GdbSourceWindow from "./ToolWindows/GdbSourceWindow";
import GdbMemoryWindow from "./ToolWindows/GdbMemoryWindow";
import GdbBreakPointWindow from "./ToolWindows/GdbBreakpointsWindow";
import GdbCallStackWindow from "./ToolWindows/GdbCallstackWindow";
import GdbCommandWindow from "./ToolWindows/GdbCommandWindow";
import GdbLocalsWindow from "./ToolWindows/GdbLocalsWindow";
import GdbRegistersWindow from "./ToolWindows/GdbRegistersWindow";
import GdbThreadsWindow from "./ToolWindows/GdbThreadsWindow";

const Default = (props: IDockviewPanelProps) => {
  return (
    <div>
      {props.api.title}
      <br />
      <button>Hello Press Me</button>
    </div>
  );
};

const components = {
  default: Default,
  sourcewin: GdbSourceWindow,
  localswin: GdbLocalsWindow,
  breakpointwin: GdbBreakPointWindow,
  callstackwin: GdbCallStackWindow,
  commandwin: GdbCommandWindow,
  memorywin: GdbMemoryWindow,
  registerwin: GdbRegistersWindow,
  threadswin: GdbThreadsWindow,
};

export default function App() {
  wait(2500);

  const onReady = (event: DockviewReadyEvent) => {
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

    const layout = event.api.toJSON();
    console.log("Layout JSON: ", layout);
  };

  return (
    <div className={"main-page-container"}>
      <ToolbarComponent id="toolbar">
        <ItemsDirective>
          <ItemDirective text="Cut" />
          <ItemDirective text="Copy" />
          <ItemDirective text="Paste" />
          <ItemDirective type="Separator" />
          <ItemDirective text="Bold" />
          <ItemDirective text="Italic" />
          <ItemDirective text="Underline" />
        </ItemsDirective>
      </ToolbarComponent>
      <DockviewReact className={"dockview-theme-abyss"} onReady={onReady} components={components} />
    </div>
  );
}

window.ipcToMain.getSettings().then(async (gdb: GdbAny): Promise<void> => {
  console.log("Layout Loaded...");
  if (gdb) {
    /* empty */
  }
});

window.onresize = () => {
  //mainWindow.update();
};

window.addEventListener("beforeunload", () => {
  console.log("******************************************");
  console.log("Unloading Browser Window");
  console.log("******************************************");

  // const layout = new LayoutSave().getSerializableLayout(dock);
  // console.log(JSON.stringify(layout, null, 2));
  // //! Save the layout to the main process
  // //!
  window.ipcToMain.notifyMain({ command: "save-dock-layout", data: "foo" });
});

/* Debug Only */
function wait(ms: number): void {
  console.log("Start waiting for " + ms + " milliseconds...");
  let x,
    y = 0;
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Do nothing, just wait
    x = y++;
    y = x++;
  }
  console.log("Waited for " + ms + " milliseconds.");
}
