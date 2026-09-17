/**
 * Dock Layout Sanitizer
 *
 * Provides utilities for validating and correcting dock layout dimensions
 * to prevent negative or invalid values from being saved to settings.
 *
 * @remarks
 * Exported symbols include `sanitizeDockLayout`. This module ensures
 * dock-spawn-ts layout dimensions remain valid across save/restore cycles.
 */

/**
 * Minimum valid height for dock panels (in pixels)
 */
const MIN_PANEL_DIMENSION = 20;

/**
 * Sanitizes a dock layout object by ensuring all dimensions are valid.
 * Corrects negative heights/widths to a minimum valid value.
 *
 * @param layout - The dock layout object to sanitize
 * @returns A sanitized copy of the layout with valid dimensions
 */
export function sanitizeDockLayout(layout: unknown): unknown {
  const log = (msg: string) => {
    if (__REVEALGDB_DEBUG__) {
      console.log(msg);
      const windowWithIpc =
        typeof window !== "undefined"
          ? (window as { ipcToMain?: { instrumentationLog?: (msg: string) => void } })
          : undefined;
      windowWithIpc?.ipcToMain?.instrumentationLog?.(msg);
    }
  };

  log("[SANITIZE] Starting sanitization of dock layout");
  if (!layout || typeof layout !== "object") {
    log("[SANITIZE] Layout is null/undefined/not-object, skipping");
    return layout;
  }

  // Handle layout wrapper object that has graphInfo and dialogsInfo
  const layoutObj = layout as Record<string, unknown>;
  if (layoutObj.graphInfo) {
    log("[SANITIZE] Found graphInfo, sanitizing graph structure");
    layoutObj.graphInfo = sanitizeLayoutNode(layoutObj.graphInfo as Record<string, unknown>, log);
  } else if (layoutObj.state || layoutObj.children) {
    // Direct layout node (for test cases)
    log("[SANITIZE] No graphInfo found, sanitizing layout node directly");
    return sanitizeLayoutNode(layoutObj, log);
  }

  const result = layoutObj;
  log("[SANITIZE] Sanitization complete");
  return result;
}

/**
 * Recursively sanitizes a layout node and all its children
 */
function sanitizeLayoutNode(
  node: Record<string, unknown>,
  log: (msg: string) => void,
): Record<string, unknown> {
  const sanitized = { ...node };

  // Log node type for debugging
  const nodeType = (sanitized.containerType as string) || "unknown";
  const element = (sanitized.state as Record<string, unknown> | undefined)?.element || "no-element";
  const height = (sanitized.state as Record<string, unknown> | undefined)?.height;
  log(`[SANITIZE] Processing node: type=${nodeType}, element=${element}, height=${height}`);

  // Sanitize state object if present
  if (sanitized.state && typeof sanitized.state === "object") {
    const state = { ...sanitized.state } as Record<string, unknown>;

    // Fix negative or zero dimensions
    if (typeof state.width === "number") {
      const oldWidth = state.width;
      state.width = Math.max(state.width, MIN_PANEL_DIMENSION);
      if (oldWidth !== state.width) {
        log(
          `[SANITIZE] Fixed width: ${oldWidth} -> ${state.width} for element ${(state.element as string) || "unknown"}`,
        );
      }
    }

    if (typeof state.height === "number") {
      const oldHeight = state.height;
      state.height = Math.max(state.height, MIN_PANEL_DIMENSION);
      if (oldHeight !== state.height) {
        log(
          `[SANITIZE] Fixed height: ${oldHeight} -> ${state.height} for element ${(state.element as string) || "unknown"}`,
        );
      }
    }

    sanitized.state = state;
  }

  // Recursively sanitize children
  if (Array.isArray(sanitized.children)) {
    sanitized.children = sanitized.children.map((child) => {
      if (child && typeof child === "object") {
        return sanitizeLayoutNode(child as Record<string, unknown>, log);
      }
      return child;
    });
  }

  return sanitized;
}
