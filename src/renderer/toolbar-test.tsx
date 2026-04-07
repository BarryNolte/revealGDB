import { createRoot } from "react-dom/client";
import "./index.css";
import { setupToolbarTestApi, ToolbarTestPage } from "./test-helpers/toolbar-test-page";

setupToolbarTestApi();

const container = document.getElementById("toolbar-root-page");
if (container) {
  createRoot(container).render(<ToolbarTestPage />);
}
