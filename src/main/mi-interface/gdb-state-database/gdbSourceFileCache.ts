import { readFile } from "fs/promises";
import EventEmitter from "events";

export class gdbSourceFileCache extends EventEmitter {
  private sourceFiles: Map<string, string> = new Map<string, string>();

  constructor() {
    super();
  }

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
        this.emit("error-stream", `Error reading file: ${file} : ${ex}`);
      }
    } else {
      srcHtml = this.sourceFiles.get(file) || "";
    }

    if (srcHtml.length === 0) {
      return undefined;
    }

    return srcHtml;
  }

  dump(): void {
    this.sourceFiles.keys().forEach((file) => {
      console.log(`${this.sourceFiles.get(file)?.length.toString().padStart(6, " ")} => ${file}`);
    });
  }
}
