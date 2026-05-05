/**
 * Implements main for revealGDB runtime behavior.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { registerLicense } from "@syncfusion/ej2-base";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./syncfusion.css";

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

// Notify main process that renderer has started initialization
window.ipcToMain.commands.app.notifyMain({ command: "renderStart" });

// Create and mount the React application
const container = document.getElementById("root")!;
createRoot(container).render(<App />);

// Notify main process that renderer initialization is complete
window.ipcToMain.commands.app.notifyMain({ command: "renderEnd" });
