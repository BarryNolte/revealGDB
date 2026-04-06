/**
 * Implements source file store logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `SourceFileStore`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { gdbSourceFileCache } from "../gdbSourceFileCache";

export class SourceFileStore {
  readonly gdbSrcFileCache: gdbSourceFileCache = new gdbSourceFileCache();

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
    return this.gdbSrcFileCache.hasSourceFile(file);
  }

  /**
   * Returns source file contents from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications. Performs asynchronous work and should be used with completion ordering in mind.
   *
   * @param file - Filesystem or source path used to locate the target resource.
   * @returns A promise that resolves with the computed result after asynchronous processing completes.
   */
  async getSourceFileContents(file: string): Promise<string | undefined> {
    return await this.gdbSrcFileCache.getSourceFileContents(file);
  }

  /**
   * Clears cache from managed state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   */
  clearCache(): void {
    this.gdbSrcFileCache.clearCache();
  }
}
