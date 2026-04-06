/**
 * Implements gdb connector logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `OutputAvailableEventArgs`, `GdbConnector`. It sits on the debugger data path that translates MI records into typed stores and notifications.
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

  /**
   * Starts the operation for the current workflow.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param _selectedConnection - Value for `_selectedConnection` consumed by this operation.
   * @returns True when the operation succeeds; otherwise false.
   */
  public Start(_selectedConnection: SelectedConnection): boolean {
    return false;
  }
  /**
   * Performs end as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns True when the operation succeeds; otherwise false.
   */
  public End(): boolean {
    return false;
  }

  /**
   * Performs is running as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @returns True when the operation succeeds; otherwise false.
   */
  public IsRunning(): boolean {
    return false;
  }

  /**
   * Performs send as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param _data - Value for `_data` consumed by this operation.
   */
  public Send(_data: string): void {
    //console.log(data);
  }
}
