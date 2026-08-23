/**
 * Workspace persistence layer for revealGDB docking system.
 *
 * @remarks
 * Provides type-safe wrappers around electron-settings for saving/loading workspace state.
 * Ported from DockManager reference implementation, adapted for revealGDB's settings structure.
 */
import type { MonitorProfiles } from "../common/monitor-profile-types";
import type { DockHostLayout, WorkspaceState } from "../common/workspace-types";

/**
 * Settings-like object (electron-settings or compatible).
 */
type SettingsLike = {
  getSync(key: string): unknown;
  setSync(key: string, value: unknown): void;
  deleteSync?(key: string): void;
  unsetSync?(key: string): void;
};

/**
 * Import satellite window types for persistence.
 */
import type { SatelliteWindowsState } from "../common/satellite-window-types";

/**
 * Workspace persistence operations.
 *
 * @remarks
 * All operations read/write to the `gdb.workspace` and `gdb.gui` subtrees of electron-settings.
 * Paths follow the pattern: `gdb.workspace.*` for workspace data, `gdb.gui.dockLayout` for layouts.
 */
export class WorkspacePersistence {
  // Settings key constants to avoid duplication
  private static readonly SATELLITE_WINDOWS_KEY = "gdb.workspace.satelliteWindows";
  private static readonly MONITOR_PROFILES_KEY = "gdb.workspace.monitorProfiles";

  /**
   * Reference to settings instance.
   */
  private settings: SettingsLike;

  /**
   * Creates a new workspace persistence layer.
   */
  constructor(appSettings: SettingsLike) {
    this.settings = appSettings;
  }

  /**
   * Load persisted workspace state.
   *
   * @returns Workspace state, or undefined if none saved yet.
   */
  public loadWorkspace(): WorkspaceState | undefined {
    return this.settings.getSync("gdb.workspace.state") as WorkspaceState | undefined;
  }

  /**
   * Save workspace state.
   *
   * @param workspace - The workspace state to persist.
   */
  public saveWorkspace(workspace: WorkspaceState): void {
    this.settings.setSync("gdb.workspace.state", workspace);
  }

  /**
   * Load dock layout for a specific host.
   *
   * @param hostId - Host identifier (default: "main").
   * @returns Serialized dock layout, or undefined if none saved.
   */
  public loadHostLayout(hostId: string = "main"): DockHostLayout | undefined {
    const mainHostKey = "gdb.gui.dockLayout";
    // For now, single-window uses the existing `gdb.gui.dockLayout` path
    if (hostId === "main") {
      return this.settings.getSync(mainHostKey) as DockHostLayout | undefined;
    }
    // Future multi-window: load per-host layouts
    const hostLayoutKey = `gdb.workspace.hostLayouts.${hostId}`;
    return this.settings.getSync(hostLayoutKey) as DockHostLayout | undefined;
  }

  /**
   * Save dock layout for a specific host.
   *
   * @param hostId - Host identifier (default: "main").
   * @param layout - Serialized dock layout (null to clear).
   */
  public saveHostLayout(hostId: string = "main", layout: DockHostLayout | null): void {
    const mainHostKey = "gdb.gui.dockLayout";
    // For now, single-window uses the existing `gdb.gui.dockLayout` path
    if (hostId === "main") {
      if (layout) {
        this.settings.setSync(mainHostKey, layout);
      } else {
        // Try deleteSync, fall back to unsetSync
        if (this.settings.deleteSync) {
          this.settings.deleteSync(mainHostKey);
        } else if (this.settings.unsetSync) {
          this.settings.unsetSync(mainHostKey);
        }
      }
      return;
    }
    // Future multi-window: save per-host layouts
    const hostLayoutKey = `gdb.workspace.hostLayouts.${hostId}`;
    if (layout) {
      this.settings.setSync(hostLayoutKey, layout);
    } else {
      // Try deleteSync, fall back to unsetSync
      if (this.settings.deleteSync) {
        this.settings.deleteSync(hostLayoutKey);
      } else if (this.settings.unsetSync) {
        this.settings.unsetSync(hostLayoutKey);
      }
    }
  }

  /**
   * Load window bounds for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @returns Window bounds as [x, y, width, height], or undefined if none saved.
   */
  public loadWindowBounds(hostId: string): [number, number, number, number] | undefined {
    const bounds = this.settings.getSync(`gdb.workspace.windowBounds.${hostId}`) as
      | [number, number, number, number]
      | undefined;
    return bounds;
  }

  /**
   * Save window bounds for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @param bounds - Window bounds as [x, y, width, height].
   */
  public saveWindowBounds(hostId: string, bounds: [number, number, number, number]): void {
    this.settings.setSync(`gdb.workspace.windowBounds.${hostId}`, bounds);
  }

  /**
   * Load maximized state for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @returns True if window is maximized, false otherwise.
   */
  public loadWindowMaximized(hostId: string): boolean {
    return (
      (this.settings.getSync(`gdb.workspace.windowMaximized.${hostId}`) as boolean | undefined) ??
      false
    );
  }

  /**
   * Save maximized state for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @param isMaximized - True if window is maximized.
   */
  public saveWindowMaximized(hostId: string, isMaximized: boolean): void {
    this.settings.setSync(`gdb.workspace.windowMaximized.${hostId}`, isMaximized);
  }

  /**
   * Load fullscreen state for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @returns True if window is in fullscreen, false otherwise.
   */
  public loadWindowFullScreen(hostId: string): boolean {
    return (
      (this.settings.getSync(`gdb.workspace.windowFullScreen.${hostId}`) as boolean | undefined) ??
      false
    );
  }

  /**
   * Save fullscreen state for a specific host (future multi-window support).
   *
   * @param hostId - Host identifier.
   * @param isFullScreen - True if window is in fullscreen.
   */
  public saveWindowFullScreen(hostId: string, isFullScreen: boolean): void {
    this.settings.setSync(`gdb.workspace.windowFullScreen.${hostId}`, isFullScreen);
  }

  /**
   * Load satellite windows state.
   *
   * @returns SatelliteWindowsState if saved, undefined otherwise.
   */
  public loadSatelliteWindows(): SatelliteWindowsState | undefined {
    return this.settings.getSync(WorkspacePersistence.SATELLITE_WINDOWS_KEY) as
      | SatelliteWindowsState
      | undefined;
  }

  /**
   * Save satellite windows state.
   *
   * @param state - The satellite windows state to persist.
   */
  public saveSatelliteWindows(state: SatelliteWindowsState): void {
    this.settings.setSync(WorkspacePersistence.SATELLITE_WINDOWS_KEY, state);
  }

  /**
   * Clear all satellite windows state.
   */
  public clearSatelliteWindows(): void {
    if (this.settings.deleteSync) {
      this.settings.deleteSync(WorkspacePersistence.SATELLITE_WINDOWS_KEY);
    } else if (this.settings.unsetSync) {
      this.settings.unsetSync(WorkspacePersistence.SATELLITE_WINDOWS_KEY);
    }
  }

  /**
   * Load all monitor profiles.
   *
   * @returns MonitorProfiles container with list of profiles and current profile ID.
   */
  public getMonitorProfiles(): MonitorProfiles {
    const profiles = this.settings.getSync(WorkspacePersistence.MONITOR_PROFILES_KEY) as
      | MonitorProfiles
      | undefined;

    // Return default empty structure if none saved
    return (
      profiles || {
        profiles: [],
        currentProfileId: undefined,
      }
    );
  }

  /**
   * Save all monitor profiles.
   *
   * @param profiles - The monitor profiles container to persist.
   */
  public setMonitorProfiles(profiles: MonitorProfiles): void {
    this.settings.setSync(WorkspacePersistence.MONITOR_PROFILES_KEY, profiles);
  }

  /**
   * Get a single monitor profile by ID.
   *
   * @param profileId - Profile identifier.
   * @returns Monitor profile, or undefined if not found.
   */
  public getMonitorProfile(profileId: string) {
    const profiles = this.getMonitorProfiles();
    return profiles.profiles.find((p) => p.id === profileId);
  }

  /**
   * Delete all monitor profiles data.
   *
   * @remarks
   * Used during cleanup or factory reset.
   */
  public clearMonitorProfiles(): void {
    if (this.settings.deleteSync) {
      this.settings.deleteSync(WorkspacePersistence.MONITOR_PROFILES_KEY);
    } else if (this.settings.unsetSync) {
      this.settings.unsetSync(WorkspacePersistence.MONITOR_PROFILES_KEY);
    }
  }
}
