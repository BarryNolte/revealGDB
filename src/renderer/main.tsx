import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerLicense } from "@syncfusion/ej2-base";

registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH1cc3VdR2FeUkZwXEFWYEs=",
);

window.ipcToMain.notifyMain({ command: "renderStart" });

const container = document.getElementById("root")!;
createRoot(container).render(<App />);
window.ipcToMain.notifyMain({ command: "renderEnd" });
