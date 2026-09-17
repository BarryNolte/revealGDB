/**
 * Implements multiwindow-test for revealGDB.
 *
 * @remarks
 * Tests multi-window (satellite) creation and management via IPC.
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import { MultiWindowTestPage, setupMultiWindowTestApi } from "./test-helpers/multiwindow-test-page";

setupMultiWindowTestApi();

const container = document.getElementById("multiwindow-root-page");
if (container) {
  createRoot(container).render(<MultiWindowTestPage />);
}
