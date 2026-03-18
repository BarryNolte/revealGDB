import { MiOutputHost } from "../mi-output-types";

export type MiDoneResultStrategy = {
  canHandle: (resResult: string) => boolean;
  handle: (host: MiOutputHost, output: string, resList: string) => Promise<boolean>;
};
