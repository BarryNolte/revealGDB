import { createRoot } from "react-dom/client";
import "./index.css";
import { SettingsTestPage, setupSettingsTestApi } from "./test-helpers/settings-test-page";

setupSettingsTestApi();

const container = document.getElementById("settings-root");
if (container) {
  createRoot(container).render(<SettingsTestPage />);
}
