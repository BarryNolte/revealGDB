/**
 * Multi-window utilities for renderer process
 *
 * Provides helpers for:
 * - Extracting host ID from URL query parameters
 * - Filtering panes for current host
 * - Communicating with other hosts
 *
 * @module src/renderer/utilities/multi-window-utils
 */

/**
 * Extract the current host ID from window.location
 *
 * @returns The host ID (defaults to "main" if not specified)
 */
export function getCurrentHostId(): string {
  try {
    const url = new URL(window.location.href);
    const hostId = url.searchParams.get("dockHost");
    return hostId || "main";
  } catch {
    return "main";
  }
}

/**
 * Check if current renderer is for the main host
 */
export function isMainHost(): boolean {
  return getCurrentHostId() === "main";
}

/**
 * Get URL for launching a new satellite window
 *
 * @param baseUrl - The base renderer URL (e.g., from ELECTRON_RENDERER_URL)
 * @param hostId - The host ID to pass (optional; will generate one if not provided)
 * @returns Full URL with dockHost query parameter
 */
export function getRendererUrlWithHost(baseUrl: string, hostId?: string): string {
  const url = new URL(baseUrl);
  if (hostId) {
    url.searchParams.set("dockHost", hostId);
  }
  return url.toString();
}

/**
 * Filter DockableWindow objects for the current host
 *
 * @remarks
 * This is used by renderers to only display panes that belong to their host.
 * Panes without a hostId default to the "main" host.
 *
 * @param windows - All DockableWindow objects from workspace
 * @param hostId - The host ID to filter by (defaults to current host)
 * @returns Filtered windows for the specified host
 */
export function filterWindowsForHost<T extends { hostId?: string }>(
  windows: T[],
  hostId?: string,
): T[] {
  const targetHostId = hostId || getCurrentHostId();
  return windows.filter((w) => (w.hostId || "main") === targetHostId);
}
