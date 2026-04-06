/**
 * Implements mi result strategy types logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MiDoneResultStrategy`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
import { MiOutputHost } from "../mi-output-types";

export type MiDoneResultStrategy = {
  canHandle: (resResult: string) => boolean;
  handle: (host: MiOutputHost, output: string, resList: string) => Promise<boolean>;
};
