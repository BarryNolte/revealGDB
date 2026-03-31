import { MiOutputHost } from "./mi-output-types";

export class MiStatusAsyncHandler {
  private readonly rgxStatusAsyncRecord: RegExp = /^\+(?<result>[^,]*),?(?<data>.*)?$/;
  private readonly rgxSection: RegExp = /section="(?<section>[^"]*)"/;
  private readonly rgxSectionSize: RegExp = /section-size="(?<sectionSize>[^"]*)"/;
  private readonly rgxTotalSize: RegExp = /total-size="(?<totalSize>[^"]*)"/;
  private readonly rgxSectionSent: RegExp = /section-sent="(?<sectionSent>[^"]*)"/;
  private readonly rgxTotalSent: RegExp = /total-sent="(?<totalSent>[^"]*)"/;

  constructor(private readonly host: MiOutputHost) {}

  parseStatusAsyncRecord(output: string): boolean {
    const chunks = this.rgxStatusAsyncRecord.exec(output);

    const result = chunks?.groups?.result || "";
    const data = chunks?.groups?.data || "";

    switch (result) {
      case "download": {
        const section = this.rgxSection.exec(data)?.groups?.section || "";
        const sectionSize = this.rgxSectionSize.exec(data)?.groups?.sectionSize || "";
        const totalSize = this.rgxTotalSize.exec(data)?.groups?.totalSize || "";
        // section-sent and total-sent are only present on periodic progress updates
        const sectionSent = this.rgxSectionSent.exec(data)?.groups?.sectionSent;
        const totalSent = this.rgxTotalSent.exec(data)?.groups?.totalSent;

        const progress =
          sectionSent !== undefined && totalSent !== undefined
            ? ` section-sent="${sectionSent}" total-sent="${totalSent}"`
            : "";
        this.host.emit(
          "log-stream",
          `+download section="${section}" section-size="${sectionSize}" total-size="${totalSize}"${progress}`,
        );
        break;
      }
      default: {
        this.host.emit("log-stream", `+${result} ${data}`);
        return false;
      }
    }

    return true;
  }
}
