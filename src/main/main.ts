import { app, BrowserWindow } from "electron";
import { join } from "path";

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: join(__dirname, "..", "..", "out", "preload", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  console.log("Env: ", process.env);
  if (devUrl) {
    console.log("Loading URL:", devUrl);
    win.loadURL(devUrl);
  } else {
    console.log("Loading file:", join(__dirname, "..", "..", "out", "renderer", "index.html"));
    win.loadFile(join(__dirname, "..", "..", "out", "renderer", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
