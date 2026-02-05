import { registerLicense } from "@syncfusion/ej2-base";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

registerLicense(
  "Ngo9BigBOggjHTQxAR8/V1JGaF5cXGpCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH1cc3VdR2FeUkZwXEFWYEs=",
);

window.revealGdbBuild = {
  // eslint-disable-next-line no-undef
  debug: __REVEALGDB_DEBUG__,
  // eslint-disable-next-line no-undef
  mode: __REVEALGDB_BUILD__,
};

window.ipcToMain.notifyMain({ command: "renderStart" });

const container = document.getElementById("root")!;
createRoot(container).render(<App />);
window.ipcToMain.notifyMain({ command: "renderEnd" });
