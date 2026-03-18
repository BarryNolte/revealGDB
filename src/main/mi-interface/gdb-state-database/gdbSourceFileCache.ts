/**
 * Simple source file cache backed by WSL file reads.
 */
import EventEmitter from "events";
import { readFile } from "fs/promises";

export class gdbSourceFileCache extends EventEmitter {
  private sourceFiles: Map<string, string> = new Map<string, string>();
  private filePrefix: string = "";

  constructor() {
    super();
  }

  setFilePrefix(prefix: string): void {
    this.filePrefix = prefix;
  }

  clearCache(): void {
    this.sourceFiles.clear();
  }

  hasSourceFile(file: string): boolean {
    return this.sourceFiles.has(file);
  }

  async getSourceFileContents(file: string): Promise<string | undefined> {
    const have = this.hasSourceFile(file);
    let srcHtml: string = "";
    if (!have && file.length > 0) {
      try {
        // TODO: Resolve actual path using the active connector.
        const data = await readFile(this.filePrefix + file, "utf-8");
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
