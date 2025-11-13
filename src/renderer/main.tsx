import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerLicense } from "@syncfusion/ej2-base";

registerLicense(
  "Ngo9BigBOggjGyl/Vkd+XU9FcVRDX3xKf0x/TGpQb19xflBPallYVBYiSV9jS3tSd0VkW31cdXBQQWRfVE91Xg==",
);

window.ipcToMain.notifyMain({ command: "renderStart" });

const container = document.getElementById("root")!;
createRoot(container).render(<App />);

window.ipcToMain.notifyMain({ command: "renderEnd" });
