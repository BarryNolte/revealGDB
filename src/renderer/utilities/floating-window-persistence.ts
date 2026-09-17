/**
 * Floating Window Persistence Utilities
 *
 * Handles saving and restoring floating window state to/from settings.
 */

import type { FloatingWindowState } from "../../common/settings-types";
import type { Workspace, WorkspaceWindow } from "../../common/workspace-types";

/**
 * Persist floating window state to settings
 * Captures all floating windows with their positions and associated panels
 */
export async function saveFloatingWindowsToSettings(workspace: Workspace): Promise<void> {
  const floatingWindows: FloatingWindowState[] = [];

  // For each floating window, extract its state
  for (const window of workspace.windows.filter((w) => w.type === "floating")) {
    // Find the primary dockable window in this floating window's layout
    const panelTitle = extractPanelTitle(window);

    floatingWindows.push({
      windowId: window.id,
      panelTitle,
      bounds: window.bounds,
    });
  }

  try {
    await window.ipcToMain.commands.app.notifyMain({
      command: "save-floating-windows-state",
      data: floatingWindows,
    });
  } catch (error) {
    console.error("Failed to persist floating windows state:", error);
  }
}

/**
 * Extract the panel title from a floating window's layout
 */
function extractPanelTitle(window: WorkspaceWindow): string {
  // Try to get the first pane's window ID from the layout
  // The layout structure varies, but we'll do a best-effort extraction
  if (window.layout?.root && typeof window.layout.root === "object") {
    const root = window.layout.root as Record<string, unknown>;
    if ("windowIds" in root && Array.isArray(root.windowIds)) {
      const firstWindowId = root.windowIds[0];
      if (typeof firstWindowId === "string") {
        return firstWindowId;
      }
    }
  }
  return window.id || "Unknown";
}

/**
 * Load floating window state from settings
 */
export async function loadFloatingWindowsFromSettings(): Promise<FloatingWindowState[]> {
  try {
    const result = await window.ipcToMain.queries.app.getFloatingWindowsState();
    return result || [];
  } catch (error) {
    console.error("Failed to load floating windows state:", error);
    return [];
  }
}

/**
 * Restore floating windows from persisted state
 */
export async function restoreFloatingWindows(floatingStates: FloatingWindowState[]): Promise<void> {
  const restorePromises = floatingStates.map(async (state) => {
    try {
      await window.ipcToMain.commands.workspace.floatWindow(state.windowId);
      // Update floating window bounds if available
      if (state.bounds) {
        await window.ipcToMain.commands.workspace.updateFloatingWindowBounds({
          windowId: state.windowId,
          bounds: state.bounds,
        });
      }
    } catch (error) {
      console.error(`Failed to restore floating window ${state.windowId}:`, error);
    }
  });

  await Promise.all(restorePromises);
}
