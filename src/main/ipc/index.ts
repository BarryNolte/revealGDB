/**
 * Defines index IPC handlers that bridge renderer requests to main-process behavior.
 *
 * @remarks
 * Exported symbols include `registerIpcHandlers`. It is responsible for channel registration, payload marshalling, and returning data to renderer callers.
 */
import { registerIpcCommandHandlers } from "./commands";
import { registerIpcQueryHandlers } from "./queries";
import { IpcRegistrationContext } from "./types";

export type { IpcRegistrationContext } from "./types";

/**
 * Registers ipc handlers for the active runtime context.
 *
 * @remarks
 * Participates in main-process IPC wiring between renderer requests and backend services.
 *
 * @param context - Dependency container used to register handlers and access shared services.
 */
/**
 * Performs registerIpcHandlers as part of this module's internal workflow.
 *
 * @param context - context parameter.
 * @returns The computed result produced by this operation.
 */
export function registerIpcHandlers(context: IpcRegistrationContext): void {
  registerIpcQueryHandlers(context);
  registerIpcCommandHandlers(context);
}
