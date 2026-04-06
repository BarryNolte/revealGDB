/**
 * Bootstraps the connectiondialog test renderer harness entry used by integration tests.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  ConnectionDialogTestPage,
  setupConnectionDialogTestApi,
} from "./test-helpers/connectiondialog-test-page";

setupConnectionDialogTestApi();

const container = document.getElementById("connection-dialog-root");
if (container) {
  createRoot(container).render(<ConnectionDialogTestPage />);
}
