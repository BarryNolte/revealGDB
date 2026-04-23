import { EventEmitter } from "events";

export class GeneralInfoSender extends EventEmitter {
  public static instance: GeneralInfoSender = new GeneralInfoSender();

  private outputLines: string[] = [];
  private header: string = "";
  private relayTarget: EventEmitter | null = null;

  public setRelayTarget(target: EventEmitter): void {
    this.relayTarget = target;
  }

  public addHeader(header: string): void {
    this.header = header;
  }

  public addLine(line: string): void {
    this.outputLines.push(line);
  }

  private calculateMaxLineLength(): number {
    let maxLength = 0;
    if (this.header) {
      maxLength = this.header.length;
    }
    this.outputLines.forEach((line) => {
      if (line.length > maxLength) {
        maxLength = line.length;
      }
    });
    return maxLength;
  }

  public sendOutput(): void {
    const maxLineLength = this.calculateMaxLineLength() + 2;
    const separator = "-".repeat(maxLineLength);
    const target = this.relayTarget ?? this;
    target.emit("debug-stream", separator);
    if (this.header) {
      target.emit("debug-stream", ` ${this.header} `);
    }
    target.emit("debug-stream", separator);

    this.outputLines.forEach((line) => target.emit("debug-stream", ` ${line} `));
    // Clear the output lines after sending
    this.outputLines = [];
  }

  public sendHtmlBlock(html: string): void {
    const target = this.relayTarget ?? this;
    target.emit("html-stream", html);
  }
}
