/**
 * Base connector abstraction for launching and talking to gdb.
 */
import { EventEmitter } from "events";
import { SelectedConnection } from "../../../common/gdb-common";

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

  public Start(_selectedConnection: SelectedConnection): boolean {
    return false;
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
}
