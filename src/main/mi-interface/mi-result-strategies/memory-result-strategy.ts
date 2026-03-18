import { mainWindow } from "../../main";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";

export class MemoryResultStrategy implements MiDoneResultStrategy {
  private readonly rgxMemData: RegExp =
    /\[\{begin="(?<begin>[^"]*)",offset="(?<offset>[^"]*)",end="(?<end>[^"]*)",contents="(?<contents>[^"]*)"\}\]/;

  canHandle(resResult: string): boolean {
    return resResult === "memory";
  }

  handle(_host: MiOutputHost, output: string, _resList: string): Promise<boolean> {
    const memData = this.rgxMemData.exec(output);
    const hexData = memData?.groups?.contents || "";
    const resultBytes = [];
    for (let i = 0; i < hexData.length; i += 2) {
      resultBytes.push(hexData.slice(i, i + 2));
    }
    const dataArray = new Uint8Array(resultBytes.length);
    resultBytes.forEach((byte, idx) => {
      dataArray[idx] = parseInt(byte, 16);
    });

    mainWindow.webContents.send("data-memory", {
      begin: memData?.groups?.["begin"],
      offset: memData?.groups?.["offset"],
      end: memData?.groups?.["end"],
      data: dataArray,
    });

    return Promise.resolve(true);
  }
}
