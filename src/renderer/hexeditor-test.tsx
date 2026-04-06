/**
 * Bootstraps the hexeditor test renderer harness entry used by integration tests.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import { HexEditorTestPage } from "./test-helpers/hexeditor-test-page";

const container = document.getElementById("hexeditor-root");
if (container) {
  createRoot(container).render(<HexEditorTestPage />);
}
