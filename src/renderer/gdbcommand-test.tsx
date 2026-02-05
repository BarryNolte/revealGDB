import { createRoot } from "react-dom/client";
import "./index.css";
import { GdbCommandTestPage, setupGdbCommandTestApi } from "./test-helpers/gdbcommand-test-page";

setupGdbCommandTestApi();

const container = document.getElementById("gdbcommand-root");
if (container) {
  createRoot(container).render(<GdbCommandTestPage />);
}
