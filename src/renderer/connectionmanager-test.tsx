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
