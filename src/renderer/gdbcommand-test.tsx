/**
 * Bootstraps the gdbcommand test renderer harness entry used by integration tests.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import { GdbCommandTestPage, setupGdbCommandTestApi } from "./test-helpers/gdbcommand-test-page";

setupGdbCommandTestApi();

const container = document.getElementById("gdbcommand-root");
if (container) {
  createRoot(container).render(<GdbCommandTestPage />);
}
