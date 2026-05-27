/**
 * Implements mi status handler logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiStatusAsyncHandler`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { MiOutputHost } from "./mi-output-types";
import { LOG_STREAM } from "./mi-stream-events";

export class MiStatusAsyncHandler {
  private readonly rgxStatusAsyncRecord: RegExp = /^\+(?<result>[^,]*),?(?<data>.*)?$/;
  private readonly rgxSection: RegExp = /section="(?<section>[^"]*)"/;
  private readonly rgxSectionSize: RegExp = /section-size="(?<sectionSize>[^"]*)"/;
  private readonly rgxTotalSize: RegExp = /total-size="(?<totalSize>[^"]*)"/;
  private readonly rgxSectionSent: RegExp = /section-sent="(?<sectionSent>[^"]*)"/;
  private readonly rgxTotalSent: RegExp = /total-sent="(?<totalSent>[^"]*)"/;

  constructor(private readonly host: MiOutputHost) {}

  private getDataGroup(rgx: RegExp, data: string, key: string): string | undefined {
    return rgx.exec(data)?.groups?.[key];
  }

  private handleDownload(data: string): void {
    const section = this.getDataGroup(this.rgxSection, data, "section") ?? "";
    const sectionSize = this.getDataGroup(this.rgxSectionSize, data, "sectionSize") ?? "";
    const totalSize = this.getDataGroup(this.rgxTotalSize, data, "totalSize") ?? "";
    const sectionSent = this.getDataGroup(this.rgxSectionSent, data, "sectionSent");
    const totalSent = this.getDataGroup(this.rgxTotalSent, data, "totalSent");

    const progress =
      sectionSent !== undefined && totalSent !== undefined
        ? ` section-sent="${sectionSent}" total-sent="${totalSent}"`
        : "";
    this.host.emit(
      LOG_STREAM,
      `+download section="${section}" section-size="${sectionSize}" total-size="${totalSize}"${progress}`,
    );
  }

  /**
   * Parses input into status async record data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param output - Value for `output` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  parseStatusAsyncRecord(output: string): boolean {
    const chunks = this.rgxStatusAsyncRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "download": {
        this.handleDownload(data);
        break;
      }
      default: {
        this.host.emit(LOG_STREAM, `+${result} ${data}`);
        return false;
      }
    }

    return true;
  }
}
