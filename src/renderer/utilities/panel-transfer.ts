import { dockMenuConnector } from "./dock-menu-state";

function getPanelTitle(data: unknown): string | undefined {
  const panelTitle = (data as { panelTitle?: unknown } | undefined)?.panelTitle;
  if (typeof panelTitle !== "string") {
    return undefined;
  }
  const trimmed = panelTitle.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function handleMovePanelFromWindow(data: unknown): void {
  const panelTitle = getPanelTitle(data);
  if (!panelTitle) {
    return;
  }
  dockMenuConnector?.hidePanel(panelTitle);
}

export function handleMovePanelToWindow(data: unknown): void {
  const panelTitle = getPanelTitle(data);
  if (!panelTitle) {
    return;
  }
  dockMenuConnector?.ensurePanelDockedInRoot(panelTitle);
  dockMenuConnector?.showPanel(panelTitle);
  dockMenuConnector?.activatePanel(panelTitle);
}
