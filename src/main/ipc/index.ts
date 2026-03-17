import { registerIpcCommandHandlers } from "./commands";
import { registerIpcQueryHandlers } from "./queries";
import { IpcRegistrationContext } from "./types";

export type { IpcRegistrationContext } from "./types";

export function registerIpcHandlers(context: IpcRegistrationContext): void {
  registerIpcQueryHandlers(context);
  registerIpcCommandHandlers(context);
}
