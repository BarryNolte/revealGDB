import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("revealGDB", {
  echo: (msg: string) => msg,
});
