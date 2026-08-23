/**
 * Monitor profile management service.
 *
 * @remarks
 * Handles creation, detection, and application of monitor profiles.
 * Enables saving/restoring window layouts across different monitor configurations
 * (e.g., office dual-monitor setup vs. home single-monitor setup).
 *
 * Smart detection logic:
 * - Exact match: All displays present with same resolution/scale → use profile as-is
 * - Partial match: Some displays present → scale proportionally
 * - Fallback: No match → use default positions or last saved bounds
 */

import { Display, screen } from "electron";
import type {
  ApplyMonitorProfileRequest,
  CreateMonitorProfileRequest,
  DeleteMonitorProfileRequest,
  DisplaySnapshot,
  MonitorProfile,
  MonitorProfiles,
  ProfileDetectionResult,
} from "../common/monitor-profile-types";
import type { HostWindowBounds } from "../common/workspace-types";
import { HostWindowManager } from "./host-window-manager";
import { WorkspacePersistence } from "./workspace-persistence";

/**
 * Service for managing monitor profiles.
 *
 * @example
 * ```typescript
 * const service = new MonitorProfileService(persistence, hostWindowManager);
 *
 * // Create a profile from current display config + window state
 * const result = await service.createProfile({
 *   name: "Office Dual Monitor Setup",
 *   hostLayouts: [] // captured during profile creation
 * });
 *
 * // Auto-detect matching profile on app startup
 * const detection = await service.detectProfile();
 * if (detection.success) {
 *   await service.applyProfile({ profileId: detection.profile!.id });
 * }
 *
 * // Manually apply a saved profile
 * await service.applyProfile({
 *   profileId: 'profile-office-setup',
 *   restoreBounds: true,
 *   restoreLayouts: true
 * });
 * ```
 */
export class MonitorProfileService {
  /**
   * Initialize service with persistence and window management.
   *
   * @param persistence - Workspace persistence service for storage
   * @param hostWindowManager - Window manager for applying restored bounds
   */
  constructor(
    private persistence: WorkspacePersistence,
    private hostWindowManager: HostWindowManager,
  ) {}

  /**
   * Get all saved monitor profiles.
   */
  getProfiles(): Promise<MonitorProfiles> {
    return this.persistence.getMonitorProfiles();
  }

  /**
   * Create a new monitor profile from current display configuration.
   *
   * @param request - Profile metadata and optional layouts
   * @returns Profile ID of newly created profile
   *
   * @remarks
   * If hostLayouts not provided, fetches current window bounds from HostWindowManager.
   */
  async createProfile(request: CreateMonitorProfileRequest): Promise<string> {
    // Get current display configuration
    const displays = this.captureDisplays();

    // Get host layouts (current state or provided)
    const hostLayouts =
      request.hostLayouts ||
      (await this.hostWindowManager.getAllWindowSnapshots()).map((snapshot) => ({
        hostId: snapshot.hostId,
        hostLabel: snapshot.hostLabel,
        bounds: snapshot.bounds,
        isMaximized: snapshot.isMaximized,
        isFullscreen: snapshot.isFullscreen,
        layout: snapshot.layout,
      }));

    // Generate unique profile ID
    const profileId = `profile-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create profile
    const profile: MonitorProfile = {
      id: profileId,
      name: request.name,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      displays,
      hostLayouts,
      isActive: false,
    };

    // Persist
    const profiles = await this.getProfiles();
    profiles.profiles.push(profile);
    await this.persistence.setMonitorProfiles(profiles);

    return profileId;
  }

  /**
   * Apply a saved monitor profile to current windows.
   *
   * @param request - Profile ID and restoration options
   * @returns Success status
   *
   * @remarks
   * If current display config doesn't exactly match profile's displays,
   * uses smart scaling logic to adjust window bounds proportionally.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  async applyProfile(request: ApplyMonitorProfileRequest): Promise<boolean> {
    const profiles = await this.getProfiles();
    const profile = profiles.profiles.find((p) => p.id === request.profileId);

    if (!profile) {
      console.warn(`[MonitorProfileService] Profile not found: ${request.profileId}`);
      return false;
    }

    // Get current displays for comparison
    const currentDisplays = this.captureDisplays();

    // Restore bounds (if enabled)
    if (request.restoreBounds !== false) {
      for (const layout of profile.hostLayouts) {
        // Check if we can apply bounds directly
        const exactMatch = this.displaysMatch(profile.displays, currentDisplays);

        const boundToApply = exactMatch
          ? layout.bounds
          : this.scaleBounds(layout.bounds, profile.displays, currentDisplays);

        // Get or create host window
        const window = this.hostWindowManager.getHostWindow(layout.hostId);
        if (window) {
          // Apply bounds
          const [x, y, width, height] = [
            boundToApply.x,
            boundToApply.y,
            boundToApply.width,
            boundToApply.height,
          ];
          window.setBounds({ x, y, width, height });

          // Apply maximized state
          if (layout.isMaximized) {
            window.maximize();
          } else if (window.isMaximized()) {
            window.restore();
          }

          // Apply fullscreen state
          if (layout.isFullscreen) {
            window.setFullScreen(true);
          } else if (window.isFullScreen()) {
            window.setFullScreen(false);
          }
        }
      }
    }

    // Restore layouts (if enabled)
    if (request.restoreLayouts !== false) {
      // Layout restoration requires workspace service integration
      // Store in workspace persistence for later load
      const layoutPromises = profile.hostLayouts
        .filter((layout) => layout.layout)
        .map((layout) => this.persistence.setHostLayout(layout.hostId, JSON.parse(layout.layout)));
      await Promise.all(layoutPromises);
    }

    // Update active profile and timestamp
    profiles.currentProfileId = request.profileId;
    profile.lastUsedAt = Date.now();
    profile.isActive = true;

    // Deactivate other profiles
    for (const p of profiles.profiles) {
      if (p.id !== request.profileId) {
        p.isActive = false;
      }
    }

    await this.persistence.setMonitorProfiles(profiles);
    return true;
  }

  /**
   * Delete a monitor profile.
   *
   * @param request - Profile ID to delete
   * @returns Success status
   */
  async deleteProfile(request: DeleteMonitorProfileRequest): Promise<boolean> {
    const profiles = await this.getProfiles();
    const index = profiles.profiles.findIndex((p) => p.id === request.profileId);

    if (index < 0) {
      console.warn(`[MonitorProfileService] Profile not found: ${request.profileId}`);
      return false;
    }

    profiles.profiles.splice(index, 1);

    // Clear current profile if it was deleted
    if (profiles.currentProfileId === request.profileId) {
      profiles.currentProfileId = undefined;
    }

    await this.persistence.setMonitorProfiles(profiles);
    return true;
  }

  /**
   * Auto-detect and apply best-matching monitor profile.
   *
   * @remarks
   * Called on app startup to automatically restore window configuration
   * matching current monitor setup.
   *
   * Matching priority:
   * 1. Exact match: Same display count, resolution, scale
   * 2. Primary display match: Primary display resolution matches
   * 3. Fallback: Use most recent profile with scaling
   */
  async detectProfile(): Promise<ProfileDetectionResult> {
    const profiles = await this.getProfiles();
    const currentDisplays = this.captureDisplays();

    // 1. Try exact match
    const exactMatch = this.findExactMatchProfile(profiles.profiles, currentDisplays);
    if (exactMatch) {
      return {
        success: true,
        profile: exactMatch,
        currentDisplays,
      };
    }

    // 2. Try primary display match
    const primaryMatch = this.findPrimaryDisplayMatchProfile(profiles.profiles, currentDisplays);
    if (primaryMatch) {
      return {
        success: true,
        profile: primaryMatch,
        currentDisplays,
      };
    }

    // 3. Fallback: use most recent profile
    const mostRecent = this.findMostRecentProfile(profiles.profiles);
    if (mostRecent) {
      return {
        success: true,
        profile: mostRecent,
        currentDisplays,
      };
    }

    return {
      success: false,
      reason: "No profiles available",
      currentDisplays,
    };
  }

  /**
   * Find profile with exact display configuration match.
   *
   * @internal
   */
  private findExactMatchProfile(
    profiles: MonitorProfile[],
    currentDisplays: DisplaySnapshot[],
  ): MonitorProfile | undefined {
    return profiles.find((profile) => this.displaysMatch(profile.displays, currentDisplays));
  }

  /**
   * Find profile where primary display matches current primary display.
   *
   * @internal
   */
  private findPrimaryDisplayMatchProfile(
    profiles: MonitorProfile[],
    currentDisplays: DisplaySnapshot[],
  ): MonitorProfile | undefined {
    const primaryCurrent = currentDisplays.find((d) => d.isPrimary);
    if (!primaryCurrent) return undefined;

    return profiles.find((profile) => {
      const primaryProfile = profile.displays.find((d) => d.isPrimary);
      return (
        primaryProfile &&
        primaryCurrent.bounds.width === primaryProfile.bounds.width &&
        primaryCurrent.bounds.height === primaryProfile.bounds.height &&
        primaryCurrent.scaleFactor === primaryProfile.scaleFactor
      );
    });
  }

  /**
   * Find the most recently used profile.
   *
   * @internal
   */
  private findMostRecentProfile(profiles: MonitorProfile[]): MonitorProfile | undefined {
    if (profiles.length === 0) return undefined;
    return [...profiles].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))[0];
  }

  /**
   * Capture current display configuration.
   *
   * @internal
   */
  private captureDisplays(): DisplaySnapshot[] {
    const allDisplays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    return allDisplays.map((display: Display) => ({
      displayId: display.id,
      displayName: display.label || `Display ${display.id}`,
      bounds: {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      },
      workArea: {
        x: display.workArea.x,
        y: display.workArea.y,
        width: display.workArea.width,
        height: display.workArea.height,
      },
      scaleFactor: display.scaleFactor,
      isPrimary: display.id === primaryDisplay.id,
    }));
  }

  /**
   * Check if two display configurations match exactly.
   *
   * @internal
   */
  private displaysMatch(displays1: DisplaySnapshot[], displays2: DisplaySnapshot[]): boolean {
    if (displays1.length !== displays2.length) return false;

    // Sort by displayId to handle different ordering
    const sorted1 = [...displays1].sort((a, b) => a.displayId - b.displayId);
    const sorted2 = [...displays2].sort((a, b) => a.displayId - b.displayId);

    return sorted1.every((d1, i) => {
      const d2 = sorted2[i];
      return (
        d1.bounds.width === d2.bounds.width &&
        d1.bounds.height === d2.bounds.height &&
        d1.scaleFactor === d2.scaleFactor &&
        d1.isPrimary === d2.isPrimary
      );
    });
  }

  /**
   * Scale window bounds proportionally based on display configuration change.
   *
   * @internal
   * @remarks
   * Used when applying a profile to a different monitor configuration.
   * Scales window position and size proportionally based on changes in
   * primary display dimensions.
   */
  private scaleBounds(
    originalBounds: HostWindowBounds,
    originalDisplays: DisplaySnapshot[],
    currentDisplays: DisplaySnapshot[],
  ): HostWindowBounds {
    // Get primary displays
    const origPrimary = originalDisplays.find((d) => d.isPrimary);
    const currPrimary = currentDisplays.find((d) => d.isPrimary);

    if (!origPrimary || !currPrimary) {
      // Can't scale without primary display; return as-is
      return originalBounds;
    }

    // Calculate scale factors
    const scaleX = currPrimary.bounds.width / origPrimary.bounds.width;
    const scaleY = currPrimary.bounds.height / origPrimary.bounds.height;

    // Apply scaling (proportional, not uniform)
    const scaled: HostWindowBounds = {
      x: Math.round(originalBounds.x * scaleX),
      y: Math.round(originalBounds.y * scaleY),
      width: Math.round(originalBounds.width * scaleX),
      height: Math.round(originalBounds.height * scaleY),
    };

    // Clamp to visible area
    const clampedToScreen = this.hostWindowManager.clampBoundsToScreen(scaled);
    return clampedToScreen;
  }
}
