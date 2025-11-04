import { createRoot } from "react-dom/client";
import App from "./App";
// @ts-expect-error: allow importing CSS as a side-effect without type declarations
import "./index.css";

const container = document.getElementById("root")!;
createRoot(container).render(<App />);
