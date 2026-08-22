/**
 * Utility functions for DockWorkspace component integration.
 *
 * @remarks
 * Provides helpers for URL parsing, fallback layout generation,
 * and dock-spawn-ts layout serialization/deserialization.
 */

import type { DockHostLayout, WorkspaceState } from "../../common/workspace-types";

export async function persistHostLayoutState(
  hostId: string,
  layoutState: DockHostLayout,
  saveHostLayout: (hostId: string, layout: DockHostLayout) => Promise<void>,
  notifyMain?: (payload: { command: "save-dock-layout"; data: DockHostLayout }) => void,
  persistLegacyMainLayout = false,
): Promise<void> {
  if (persistLegacyMainLayout && hostId === "main" && notifyMain) {
    notifyMain({
      command: "save-dock-layout",
      data: layoutState,
    });
  }

  await saveHostLayout(hostId, layoutState);
}

/**
 * Extracts the host ID from the current window's URL query parameters.
 *
 * @remarks
 * If no ?dockHost=<id> parameter is found, returns 'main' as default.
 * Useful for identifying which workspace host this window represents.
 *
 * @returns Host ID string (e.g., "main", "dock-1", "dock-abc123")
 */
export function getHostIdFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("dockHost") || "main";
}

/**
 * Creates a default fallback layout for dock-spawn-ts.
 *
 * @remarks
 * Used when no saved layout exists or layout restoration fails.
 * Generates a 9-panel default with 3 documents + 6 tool windows.
 *
 * @returns Empty object (dock-spawn-ts will auto-generate default on empty layout)
 */
export function createFallbackLayout(): DockHostLayout {
  // Return empty object - dock-spawn-ts will create default layout
  // when loadState('{}') is called with empty JSON
  return {};
}

/**
 * Serializes dock-spawn-ts layout object to JSON string.
 *
 * @remarks
 * Simple wrapper for JSON.stringify, included for consistency
 * and future extensibility (e.g., layout compression, validation).
 *
 * @param layout - Layout object from dockManager.saveState()
 * @returns JSON string representation of layout
 */
export function serializeLayout(layout: DockHostLayout): string {
  return JSON.stringify(layout);
}

/**
 * Deserializes JSON string back to dock-spawn-ts layout object.
 *
 * @remarks
 * Includes error handling - returns empty fallback layout
 * if JSON parsing fails.
 *
 * @param layoutJson - JSON string from serializeLayout() or persistent store
 * @returns Parsed layout object, or empty fallback on error
 */
export function deserializeLayout(layoutJson: string): DockHostLayout {
  try {
    return JSON.parse(layoutJson) as DockHostLayout;
  } catch (error) {
    console.warn("Failed to deserialize layout, using fallback:", error);
    return createFallbackLayout();
  }
}

/**
 * Verifies that a dock layout has usable runtime content.
 *
 * @remarks
 * Empty objects are not valid persisted layouts when dock panels are registered,
 * because they represent the pre-layout initialization state rather than a real dock tree.
 *
 * @param layout - Layout to validate
 * @returns True when the layout has meaningful content to restore or save
 */
export function hasUsableLayout(layout: DockHostLayout | undefined): layout is DockHostLayout {
  return !!layout && typeof layout === "object" && Object.keys(layout).length > 0;
}

/**
 * Resolves the layout to restore for a given host.
 *
 * @remarks
 * Host-specific workspace layouts take precedence for every host, while the legacy
 * global gdb.gui.dockLayout remains only as a fallback for the main window.
 * This prevents secondary hosts from incorrectly reusing the primary host layout.
 *
 * @param legacyMainLayout - Legacy global layout persisted under gdb.gui.dockLayout
 * @param workspaceState - Current workspace metadata including hostLayouts
 * @param hostId - Host whose layout is being restored
 * @returns Host-specific layout if available, otherwise the legacy main layout fallback
 */
export function resolveHostLayoutForRestore(
  legacyMainLayout: DockHostLayout | undefined,
  workspaceState: WorkspaceState,
  hostId: string,
): DockHostLayout | undefined {
  const hostLayout = Object.prototype.hasOwnProperty.call(workspaceState.hostLayouts, hostId)
    ? workspaceState.hostLayouts[hostId]
    : undefined;

  if (hasUsableLayout(hostLayout)) {
    return hostLayout;
  }

  if (hostId === "main" && hasUsableLayout(legacyMainLayout)) {
    return legacyMainLayout;
  }

  return undefined;
}

/**
 * Determines the layout to use based on availability.
 *
 * @remarks
 * Implements the restoration strategy:
 * 1. Try saved snapshot layout
 * 2. Fall back to empty object (auto-generated default)
 *
 * @param snapshotLayout - Layout from workspace state, if available
 * @returns Layout object ready for dockManager.loadState()
 */
export function selectLayoutForRestore(snapshotLayout: DockHostLayout | undefined): DockHostLayout {
  if (hasUsableLayout(snapshotLayout)) {
    return snapshotLayout;
  }
  return createFallbackLayout();
}
