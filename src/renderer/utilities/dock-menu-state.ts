import type { DockMenuConnector } from "./DockMenuConnector";

export let dockMenuConnector: DockMenuConnector | null = null;

export function setDockMenuConnector(connector: DockMenuConnector | null): void {
  dockMenuConnector = connector;
}
