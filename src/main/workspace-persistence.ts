/**
 * Workspace persistence layer for electron-store integration.
 *
 * @remarks
 * Provides CRUD operations for persisting and restoring workspace state,
 * including multi-host layouts and window configurations.
 * Wraps electron-store for type-safe workspace state management.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const StoreModule = require("electron-store");
// Handle both default and named exports from CommonJS module

const Store = StoreModule.default || StoreModule;

const APP_PROJECT_NAME = "revealgdb";

import type { DockHostLayout, WorkspaceState } from "../common/workspace-types";
import { WorkspaceService } from "./workspaceService";

// Type alias for Store instances to work around CommonJS require typing issues
type StoreInstance = InstanceType<typeof Store>;

const LOG_PREFIX = "[workspace-persistence]";

/**
 * Workspace persistence service that manages state storage and retrieval.
 */
export class WorkspacePersistence {
  private store: StoreInstance;

  /**
   * Creates a new WorkspacePersistence instance.
   *
   * @param storePath - Optional custom path for the store file.
   */
  constructor(storePath?: string) {
    this.store = new Store({
      projectName: APP_PROJECT_NAME,
      ...(storePath && { cwd: storePath }),
      defaults: {
        workspace: WorkspaceService.createEmptyWorkspace(),
      },
    }) as StoreInstance;
  }

  /**
   * Loads workspace state from the workspace store.
   * Returns an empty workspace if the stored state is missing or corrupted.
   */
  load(): WorkspaceState {
    try {
      let state = this.store.get("workspace");

      // Validate structure and fix if needed
      if (!state || !WorkspaceService.validateWorkspaceState(state)) {
        console.warn(
          `${LOG_PREFIX} Invalid or missing workspace state in store, using empty state`,
        );
        state = WorkspaceService.createEmptyWorkspace();
      }

      // Ensure hostLayouts is always an object (never undefined/null)
      if (!state.hostLayouts || typeof state.hostLayouts !== "object") {
        console.warn(`${LOG_PREFIX} Invalid hostLayouts structure, resetting to empty object`);
        state.hostLayouts = {};
      } else {
        // Sanitize each layout to remove corrupted data
        const sanitizedLayouts: Record<string, DockHostLayout> = {};
        Object.entries(state.hostLayouts).forEach(([hostId, layout]) => {
          const sanitized = this.sanitizeLayout(layout);
          if (Object.keys(sanitized).length > 0) {
            sanitizedLayouts[hostId] = sanitized;
            if (sanitized !== layout) {
              console.warn(`${LOG_PREFIX} Sanitized corrupted layout for host ${hostId}`);
            }
          }
        });
        state.hostLayouts = sanitizedLayouts;
      }

      // Ensure all hosts have proper IDs
      if (!state.hosts || !Array.isArray(state.hosts) || state.hosts.length === 0) {
        console.warn(`${LOG_PREFIX} Invalid hosts structure, resetting to default host`);
        state.hosts = [
          {
            id: "main",
            label: "Main Window",
            visibleWindows: [],
          },
        ];
      }

      // Normalize the state to clean up orphaned references
      const normalized = WorkspaceService.normalizeWorkspaceState(state);

      // Final safety check: ensure hostLayouts exists after normalization
      if (!normalized.hostLayouts) {
        normalized.hostLayouts = {};
      }

      return normalized;
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to load workspace state:`, error);
      const fallback = WorkspaceService.createEmptyWorkspace();
      fallback.hostLayouts = {};
      return fallback;
    }
  }

  /**
   * Validates and sanitizes a dock layout to ensure it can be deserialized.
   * Removes undefined/null values and ensures structure is compatible with dock-spawn-ts.
   *
   * @param layout - The layout to validate
   * @returns Sanitized layout, or empty object if invalid
   */
  private sanitizeLayout(layout: unknown): DockHostLayout {
    if (!layout || typeof layout !== "object") {
      return {} as DockHostLayout;
    }

    try {
      // Serialize and deserialize to remove any undefined values and ensure clean structure
      const serialized = JSON.stringify(layout);
      // Verify the JSON is valid and has content
      if (!serialized || serialized === "{}" || serialized === "null") {
        return {} as DockHostLayout;
      }
      const deserialized = JSON.parse(serialized) as DockHostLayout;
      return deserialized;
    } catch {
      // If we can't serialize/deserialize, the layout is corrupted
      console.warn(
        `${LOG_PREFIX} Layout is corrupted and cannot be serialized, using empty layout`,
      );
      return {} as DockHostLayout;
    }
  }

  /**
   * Saves workspace state to persistent store.
   * Validates and sanitizes layouts before persisting.
   *
   * @param state - The WorkspaceState to persist.
   * @throws Error if validation fails.
   */
  save(state: WorkspaceState): void {
    try {
      if (!WorkspaceService.validateWorkspaceState(state)) {
        throw new Error("Invalid workspace state: validation failed");
      }

      let normalized = WorkspaceService.normalizeWorkspaceState(state);

      // Sanitize all layouts before saving
      const sanitizedLayouts: Record<string, DockHostLayout> = {};
      if (normalized.hostLayouts && typeof normalized.hostLayouts === "object") {
        Object.entries(normalized.hostLayouts).forEach(([hostId, layout]) => {
          const sanitized = this.sanitizeLayout(layout);
          if (Object.keys(sanitized).length > 0) {
            sanitizedLayouts[hostId] = sanitized;
          }
        });
      }

      // Update the state with sanitized layouts
      normalized = {
        ...normalized,
        hostLayouts: sanitizedLayouts,
      };

      this.store.set("workspace", normalized);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to save workspace state:`, error);
      throw error;
    }
  }

  /**
   * Clears all workspace state from persistent store.
   * Restores to default empty workspace.
   */
  clear(): void {
    try {
      this.store.set("workspace", WorkspaceService.createEmptyWorkspace());
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to clear workspace state:`, error);
      throw error;
    }
  }

  /**
   * Gets the raw electron-store instance for advanced operations.
   * Use with caution to maintain type safety.
   *
   * @returns The underlying Store instance.
   */

  getStore(): StoreInstance {
    return this.store;
  }

  /**
   * Checks if the store has valid workspace data.
   *
   * @returns True if workspace data exists and is valid, false otherwise.
   */
  hasValidWorkspace(): boolean {
    try {
      const state = this.store.get("workspace");
      return state ? WorkspaceService.validateWorkspaceState(state) : false;
    } catch {
      return false;
    }
  }
}
