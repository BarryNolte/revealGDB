/**
 * Bootstraps the connectionmanager test renderer harness entry used by integration tests.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import {
  ConnectionManagerTestPage,
  setupConnectionManagerTestApi,
} from "./test-helpers/connectionmanager-test-page";

setupConnectionManagerTestApi();

const container = document.getElementById("connectionmanager-root");
if (container) {
  createRoot(container).render(<ConnectionManagerTestPage />);
}
