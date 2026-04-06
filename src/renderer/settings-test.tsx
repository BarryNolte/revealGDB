/**
 * Bootstraps the settings test renderer harness entry used by integration tests.
 *
 * @remarks
 * This file primarily contains internal declarations and implementation details. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { createRoot } from "react-dom/client";
import "./index.css";
import { SettingsTestPage, setupSettingsTestApi } from "./test-helpers/settings-test-page";

setupSettingsTestApi();

const container = document.getElementById("settings-root");
if (container) {
  createRoot(container).render(<SettingsTestPage />);
}
