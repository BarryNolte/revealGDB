/**
 * Implements toolbar-test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import { setupToolbarTestApi, ToolbarTestPage } from "./test-helpers/toolbar-test-page";

setupToolbarTestApi();

const container = document.getElementById("toolbar-root-page");
if (container) {
  createRoot(container).render(<ToolbarTestPage />);
}
