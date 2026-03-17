import { gdbSourceFileCache } from "../gdbSourceFileCache";

export class SourceFileStore {
  readonly gdbSrcFileCache: gdbSourceFileCache = new gdbSourceFileCache();

  hasSourceFile(file: string): boolean {
    return this.gdbSrcFileCache.hasSourceFile(file);
  }

  async getSourceFileContents(file: string): Promise<string | undefined> {
    return await this.gdbSrcFileCache.getSourceFileContents(file);
  }

  clearCache(): void {
    this.gdbSrcFileCache.clearCache();
  }
}
