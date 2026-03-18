import { MiOutputHost } from "../mi-output-types";
import { MiDoneResultStrategy } from "./mi-result-strategy-types";
import { parseRegisterPayload } from "./regex-parsing-helpers";

export class RegistersResultStrategy implements MiDoneResultStrategy {
  private readonly rgxCleanList: RegExp = /\[(?<list>.*)\]/;
  private readonly rgxRegisterValues: RegExp =
    /{number="(?<number>[^"]*)",value="(?<value>[^"]*)"}/g;

  canHandle(resResult: string): boolean {
    return resResult === "register-names" || resResult === "register-values";
  }

  handle(host: MiOutputHost, _output: string, resList: string): Promise<boolean> {
    const parsedPayload = parseRegisterPayload(resList, this.rgxCleanList, this.rgxRegisterValues);

    parsedPayload.names.forEach((registerName: string, index: number) => {
      host.gdbDB.addRegister(index.toString(), registerName);
    });
    parsedPayload.values.forEach((regValue) => {
      host.gdbDB.addRegisterValue(regValue.number, regValue.value);
    });

    host.gdbDB.registersUpdateUI();
    return Promise.resolve(true);
  }
}
