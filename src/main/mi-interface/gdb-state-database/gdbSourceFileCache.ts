/**
 * Implements gdb source file cache logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `gdbSourceFileCache`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import EventEmitter from "events";
import { readFile } from "fs/promises";
import { debugLog } from "../../utilities/logger";

export class gdbSourceFileCache extends EventEmitter {
  private sourceFiles: Map<string, string> = new Map<string, string>();
  private filePrefix: string = "";

  constructor() {
    super();
  }

  /**
   * Sets file prefix on current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param prefix - Value for `prefix` consumed by this operation.
   */
  setFilePrefix(prefix: string): void {
    this.filePrefix = prefix;
  }

  /**
   * Clears cache from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearCache(): void {
    this.sourceFiles.clear();
  }

  /**
   * Performs has source file as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param file - Filesystem or source path used to locate the target resource.
   * @returns True when the operation succeeds; otherwise false.
   */
  hasSourceFile(file: string): boolean {
    return this.sourceFiles.has(file);
  }

  /**
   * Returns source file contents from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Includes explicit error-handling logic for expected failure paths. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param file - Filesystem or source path used to locate the target resource.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
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

  /**
   * Performs dump as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  dump(): void {
    this.sourceFiles.keys().forEach((file) => {
      debugLog(`${this.sourceFiles.get(file)?.length.toString().padStart(6, " ")} => ${file}`);
    });
  }
}
