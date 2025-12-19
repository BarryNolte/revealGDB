//import hljs from "highlight.js";
import { readFile } from "fs/promises";
import { GdbAny } from "../../../common/gdb-common";

export class gdbSourceFileCache {
  private sourceFiles: Map<string, string> = new Map<string, string>();

  constructor() {}

  hasSourceFile(file: string): boolean {
    return this.sourceFiles.has(file);
  }

  async getSourceFileContents(file: string): Promise<string | undefined> {
    const have = this.hasSourceFile(file);
    let srcHtml: string = "";
    if (!have && file.length > 0) {
      try {
        //TODO: Need to get the actual path from the connector
        const data = await readFile("//wsl$/Ubuntu" + file, "utf-8");
        this.sourceFiles.set(file, data);
        srcHtml = data;
      } catch (ex) {
        console.error(`Error reading file: ${file} : ${ex}`);
      }
    } else {
      srcHtml = this.sourceFiles.get(file) || "";
    }

    if (srcHtml.length === 0) {
      return undefined;
    }

    // let retCnt: number = 1;
    // for (let i=0; i < srcHtml.length; i++) {
    //     if (srcHtml[i] === '\n') {
    //         retCnt++;
    //     }
    // }
    // console.log(`File: ${file} has ${retCnt} lines`);

    return srcHtml;
  }

  dump(): GdbAny {
    this.sourceFiles.keys().forEach((file) => {
      console.log(`${this.sourceFiles.get(file)?.length.toString().padStart(6, " ")} => ${file}`);
    });
  }
}
