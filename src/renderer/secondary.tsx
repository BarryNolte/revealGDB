/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { registerLicense } from "@syncfusion/ej2-base";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./syncfusion.css";
import { JSX, useEffect } from "react";
import { SAVE_DOCK_LAYOUT } from "./utilities/renderer-events";
import { ToolWindowsHostErrorBoundary } from "./Errors/ToolWindowsHostErrorBoundary";
//import { NotifyRenderMessage } from "../common/ipc-contracts";
// import { DockManager } from "dock-spawn-ts";

// Register Syncfusion component license
// Required for Syncfusion UI components (Grid, Docking, Dialog, etc.)
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JHaF5cWWdCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdlWXxdcXVSQmRfVUdxX0ZWYEo=",
);

// Expose build configuration to the global scope
// Used by various components to enable/disable debug features
window.revealGdbBuild = {
  debug: __REVEALGDB_DEBUG__,

  mode: __REVEALGDB_BUILD__,
};

// let dockManager: DockManager;

// const dockManagerElement = document.getElementById("revealDockManager")!;
// dockManager = new DockManager(dockManagerElement);
// dockManager.initialize();

function handleResize() {
  //   const divDockManager = document.getElementById("revealDockDiv")!;
  //   dockManager.resize(
  //     window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
  //     window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop),
  //   );
  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
}

export default function SecondaryWindow(): JSX.Element {
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div id="revealDockDiv" className="full-size">
      <div id="revealDockManager" className="revealDockManager"></div>
      <ToolWindowsHostErrorBoundary>
        <h2>Secondary Window Content</h2>
      </ToolWindowsHostErrorBoundary>
    </div>
  );
}

window.onload = () => {
  window.ipcToMain.commands.app.notifyMain({ command: "secondary-window-loaded" });
  window.dispatchEvent(new Event(SAVE_DOCK_LAYOUT));
};

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

// Notify main process that renderer has started initialization
window.ipcToMain.commands.app.notifyMain({ command: "renderStart" });

// Create and mount the React application
const container = document.getElementById("root")!;
createRoot(container).render(<SecondaryWindow />);

//window.document.title = "A Secondary Window";

// Notify main process that renderer initialization is complete
window.ipcToMain.commands.app.notifyMain({ command: "renderEnd" });

/**
 * Handle dock layout save requests.
 * Serializes the current layout and sends it to the main process for persistence.
 */
window.addEventListener(SAVE_DOCK_LAYOUT, () => {
  const lo = JSON.parse(
    //dockManager.saveState());
    '{ "layout": "Hello World" }',
  );
  window.ipcToMain.commands.app.notifyMain({
    command: "save-dock-layout",
    data: {
      windowName: window.document.title,
      layout: lo,
    },
  });
});
