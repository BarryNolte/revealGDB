/**
 * Main entry point for the RevealGDB renderer process.
 *
 * This file initializes the React application, registers required licenses,
 * and sets up the build configuration. It creates the root React component
 * and mounts it to the DOM.
 *
 * The renderer process runs in a Chromium-based browser context and is isolated
 * from Node.js APIs for security. Communication with the main process occurs
 * via the IPC bridge exposed through window.ipcToMain.
 */

import { registerLicense } from "@syncfusion/ej2-base";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./syncfusion.css";

// Register Syncfusion component license
// Required for Syncfusion UI components (Grid, Docking, Dialog, etc.)
registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH1cc3VdR2FeUkZwXEFWYEs=",
);

// Expose build configuration to the global scope
// Used by various components to enable/disable debug features
window.revealGdbBuild = {
  // eslint-disable-next-line no-undef
  debug: __REVEALGDB_DEBUG__,
  // eslint-disable-next-line no-undef
  mode: __REVEALGDB_BUILD__,
};

// Notify main process that renderer has started initialization
window.ipcToMain.notifyMain({ command: "renderStart" });

// Create and mount the React application
const container = document.getElementById("root")!;
createRoot(container).render(<App />);

// Notify main process that renderer initialization is complete
window.ipcToMain.notifyMain({ command: "renderEnd" });
