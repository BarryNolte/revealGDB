import { createRoot } from "react-dom/client";
import "./index.css";
import { HexEditorTestPage } from "./test-helpers/hexeditor-test-page";

const container = document.getElementById("hexeditor-root");
if (container) {
  createRoot(container).render(<HexEditorTestPage />);
}
