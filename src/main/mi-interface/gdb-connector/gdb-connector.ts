import { EventEmitter } from "events";

export class OutputAvailableEventArgs {
  private static lineNumCounter: number = 0;
  public Output: string = "";
  public LineNum: number = -1;
  constructor(output: string) {
    this.Output = output;
    this.LineNum = OutputAvailableEventArgs.lineNumCounter;
    OutputAvailableEventArgs.lineNumCounter++;
  }
}

export class GdbConnector extends EventEmitter {
  constructor() {
    super();
  }

  public async Start(): Promise<boolean> {
    return await Promise.resolve(false);
  }
  public End(): boolean {
    return false;
  }

  public IsRunning(): boolean {
    return false;
  }

  public Send(_data: string): void {
    //console.log(data);
  }

  public ConvertFilePath(path: string): string {
    console.log(path);
    return "";
  }
}
