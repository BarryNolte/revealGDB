/**
 * Implements dock-menu-state for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import type { DockMenuConnector } from "./DockMenuConnector";

export let dockMenuConnector: DockMenuConnector | null = null;
/**
 * Performs setDockMenuConnector as part of this module's internal workflow.
 *
 * @param connector - connector parameter.
 * @returns The computed result produced by this operation.
 */

export function setDockMenuConnector(connector: DockMenuConnector | null): void {
  dockMenuConnector = connector;
}
