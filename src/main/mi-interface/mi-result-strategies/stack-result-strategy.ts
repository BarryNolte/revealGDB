import { mainWindow } from "../../main";
import { MiOutputHost, gdbShowSourceInfo } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { getRegexMatches, parseFrameDataFromGroups } from "./regex-parsing-helpers";

export class StackResultStrategy implements MiDoneResultStrategy {
  private readonly rgxFrame: RegExp =
    /frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",file="(?<file>[^"]*)",fullname="(?<fullname>[^"]*)",line="(?<line>[^"]*)",arch="(?<arch>[^"]*)"},/g;

  canHandle(resResult: string): boolean {
    return resResult === "stack";
  }

  async handle(host: MiOutputHost, _output: string, resList: string): Promise<boolean> {
    const frameValues = getRegexMatches(resList, this.rgxFrame);

    host.gdbDB.clearStackFrames();
    frameValues.forEach((frameChunk) => {
      host.gdbDB.addStackFrame({
        active: false,
        ...parseFrameDataFromGroups(frameChunk.groups, ""),
      });
    });
    host.gdbDB.stackFrames[0].active = true;
    host.gdbDB.stackUpdateUI();

    const srcFileName = host.gdbDB.stackFrames[0].fullName || "";
    const showSourceInfo: gdbShowSourceInfo = {
      fileName: srcFileName,
      line: host.gdbDB.stackFrames[0].line,
      contents: await host.gdbDB.getSourceFileContents(srcFileName),
    };

    mainWindow.webContents.send("source-file", showSourceInfo);
    return true;
  }
}
