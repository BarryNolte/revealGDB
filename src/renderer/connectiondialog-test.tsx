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
