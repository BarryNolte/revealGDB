import { mainWindow } from "../../main";
import { mapRegexGroupsToMemoryData } from "../mappers/memory-mapper";
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
    mainWindow.webContents.send("data-memory", mapRegexGroupsToMemoryData(memData?.groups));
    return Promise.resolve(true);
  }
}
