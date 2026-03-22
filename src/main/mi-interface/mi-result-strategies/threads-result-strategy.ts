import { mainWindow } from "../../main";
import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { getRegexGroups, getRegexMatches } from "./regex-parsing-helpers";
import { parseThreadFrameFromGroups } from "./thread-parsing-helpers";

export class ThreadsResultStrategy implements MiDoneResultStrategy {
  private readonly rgxThreads: RegExp = /\[(?<data>.*)\],current-thread-id="(?<curTid>.*)"/;
  private readonly rgxThreadData: RegExp =
    /{id="(?<tid>[^"]*)",target-id="(?<targId>[^"]*)"(?:,name="(?<name>[^"]*)")?(?:,details="(?<details>[^"]*)")?,frame={level="(?<level>[^"]*)",addr="(?<addr>[^"]*)",func="(?<func>[^"]*)",args=\[(?<args>[^\]]*)\](?:,file="(?<file>[^"]*)")?(?:,fullname="(?<fullname>[^"]*)")?(?:,line="(?<line>[^"]*)")?(?:,from="(?<from>[^"]*)")?,arch="(?<arch>[^"]*)"\},state="(?<state>[^"]*)"}/g;

  canHandle(resResult: string): boolean {
    return resResult === "threads";
  }

  handle(host: MiOutputHost, _output: string, resList: string): Promise<boolean> {
    const thVals = getRegexGroups(resList, this.rgxThreads);
    const curTid = thVals?.curTid || "";
    const tData = thVals?.data || "";
    const tValues = getRegexMatches(tData, this.rgxThreadData);

    host.gdbDB.clearThreadList();
    tValues.forEach((thread) => {
      const threadFrame = parseThreadFrameFromGroups(thread.groups);
      host.gdbDB.addThread({
        id: thread.groups?.tid || "",
        targetId: thread.groups?.targId || "",
        name: thread.groups?.name || "",
        details: thread.groups?.details || "",
        frame: threadFrame,
        state: thread.groups?.state || "",
        active: (thread.groups?.tid || "") === curTid,
      });
    });

    mainWindow.webContents.send("data-threads", {
      th: host.gdbDB.threads,
      grp: host.gdbDB.threadGroups,
    });
    return Promise.resolve(true);
  }
}
