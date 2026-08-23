/**
 * Workspace service for revealGDB docking system.
 *
 * @remarks
 * Provides business logic for window CRUD, group transitions, visibility management.
 * Ported from DockManager reference implementation.
 * This service owns the workspace state and ensures consistency.
 */
import type {
  CreateWindowRequest,
  DockableWindow,
  DockHost,
  MoveWindowRequest,
  SaveHostLayoutRequest,
  SetWindowVisibilityRequest,
  WorkspaceState,
} from "../common/workspace-types";
import { WorkspacePersistence } from "./workspace-persistence";

/**
 * Workspace service.
 */
export class WorkspaceService {
  /**
   * Persistence layer.
   */
  private persistence: WorkspacePersistence;

  /**
   * Current workspace state.
   */
  private workspace: WorkspaceState;

  /**
   * Creates a new workspace service with the given persistence layer.
   *
   * @param persistence - WorkspacePersistence instance.
   * @param defaultWorkspace - Optional default workspace to use if none is persisted.
   */
  constructor(persistence: WorkspacePersistence, defaultWorkspace?: WorkspaceState) {
    this.persistence = persistence;

    // Try to load persisted workspace, or use default
    const persisted = this.persistence.loadWorkspace();
    if (persisted) {
      this.workspace = persisted;
    } else if (defaultWorkspace) {
      this.workspace = defaultWorkspace;
    } else {
      // Fallback: empty workspace
      this.workspace = {
        id: "default",
        windows: [],
        hosts: [
          {
            id: "main",
            label: "Main Window",
            isVisible: true,
            createdAt: Date.now(),
          },
        ],
        hostLayouts: {},
        hostWindowBounds: {
          main: { x: 0, y: 0, width: 1024, height: 768 },
        },
        hostWindowMaximized: { main: false },
        hostWindowFullscreen: { main: false },
        updatedAt: Date.now(),
      };
    }

    // Ensure all required properties are initialized
    if (!this.workspace.hosts) {
      this.workspace.hosts = [
        {
          id: "main",
          label: "Main Window",
          isVisible: true,
          createdAt: Date.now(),
        },
      ];
    }
    if (!this.workspace.hostLayouts) {
      this.workspace.hostLayouts = {};
    }
    if (!this.workspace.hostWindowBounds) {
      this.workspace.hostWindowBounds = {};
    }
    if (!this.workspace.hostWindowMaximized) {
      this.workspace.hostWindowMaximized = {};
    }
    if (!this.workspace.hostWindowFullscreen) {
      this.workspace.hostWindowFullscreen = {};
    }

    // Ensure all hosts have state entries
    this.workspace.hosts.forEach((host) => {
      if (!this.workspace.hostLayouts[host.id]) {
        this.workspace.hostLayouts[host.id] = {};
      }
      if (!this.workspace.hostWindowBounds[host.id]) {
        this.workspace.hostWindowBounds[host.id] = {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        };
      }
      if (!this.workspace.hostWindowMaximized[host.id]) {
        this.workspace.hostWindowMaximized[host.id] = false;
      }
      if (!this.workspace.hostWindowFullscreen[host.id]) {
        this.workspace.hostWindowFullscreen[host.id] = false;
      }
    });
  }

  /**
   * Get current workspace state.
   *
   * @returns The workspace state.
   */
  public getWorkspace(): WorkspaceState {
    return this.workspace;
  }

  /**
   * Get a window by ID.
   *
   * @param windowId - Window identifier.
   * @returns The window, or undefined if not found.
   */
  public getWindow(windowId: string): DockableWindow | undefined {
    return this.workspace.windows.find((w) => w.id === windowId);
  }

  /**
   * Create a new window and add it to the workspace.
   *
   * @param request - CreateWindowRequest with window details.
   * @returns Updated workspace state.
   */
  public createWindow(request: CreateWindowRequest): WorkspaceState {
    const id = request.id || `window_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const group = request.group ?? "toolwindows";
    const displayMode = request.displayMode ?? "docked";

    const newWindow: DockableWindow = {
      id,
      title: request.title,
      body: request.body,
      type: request.type,
      group,
      isVisible: true,
      displayMode,
      windowState: request.windowState,
    };

    // Add to workspace, replacing any existing window with same ID
    this.workspace.windows = this.workspace.windows.filter((w) => w.id !== id).concat(newWindow);
    this.workspace.updatedAt = Date.now();
    this.persistence.saveWorkspace(this.workspace);

    return this.workspace;
  }

  /**
   * Move a window to a different group (e.g., toolwindows → documents).
   *
   * @param request - MoveWindowRequest.
   * @returns Updated workspace state.
   */
  public moveWindow(request: MoveWindowRequest): WorkspaceState {
    const window = this.getWindow(request.windowId);
    if (!window) {
      return this.workspace;
    }

    window.lastKnownGroup = window.group;
    window.group = request.group;
    window.isVisible = true; // Show when moving
    this.workspace.updatedAt = Date.now();
    this.persistence.saveWorkspace(this.workspace);

    return this.workspace;
  }

  /**
   * Set window visibility.
   *
   * @param request - SetWindowVisibilityRequest.
   * @returns Updated workspace state.
   */
  public setWindowVisibility(request: SetWindowVisibilityRequest): WorkspaceState {
    const window = this.getWindow(request.windowId);
    if (!window) {
      return this.workspace;
    }

    if (request.isVisible) {
      // Show window, optionally restore to a specific group
      window.isVisible = true;
      if (request.group) {
        window.group = request.group;
      } else if (window.lastKnownGroup) {
        window.group = window.lastKnownGroup;
      }
    } else {
      // Hide window, remember its current group for restoration
      window.lastKnownGroup = window.group;
      window.isVisible = false;
    }

    this.workspace.updatedAt = Date.now();
    this.persistence.saveWorkspace(this.workspace);

    return this.workspace;
  }

  /**
   * Save dock layout for a host.
   *
   * @param request - SaveHostLayoutRequest.
   * @returns Object with workspace and result.
   */
  public saveHostLayout(request: SaveHostLayoutRequest): {
    workspace: WorkspaceState;
    result: boolean;
  } {
    try {
      this.persistence.saveHostLayout(request.hostId, request.layout);
      this.workspace.updatedAt = Date.now();
      return { workspace: this.workspace, result: true };
    } catch {
      return { workspace: this.workspace, result: false };
    }
  }

  /**
   * Load dock layout for a host.
   *
   * @param hostId - Host identifier (default: "main").
   * @returns Serialized dock layout, or undefined if none.
   */
  public loadHostLayout(hostId: string = "main"): string | undefined {
    const layout = this.persistence.loadHostLayout(hostId);
    if (layout) {
      try {
        return JSON.stringify(layout);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * Create a new satellite host.
   *
   * @param label - Optional human-readable label (auto-generated if omitted).
   * @returns Object with hostId and created DockHost.
   */
  public createSatelliteHost(label?: string): { hostId: string; host: DockHost } {
    // Generate unique host ID
    const hostId = `satellite-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Generate label if not provided
    const finalLabel = label || `Dock Window ${this.workspace.hosts.length}`;

    // Create host entry
    const host: DockHost = {
      id: hostId,
      label: finalLabel,
      isVisible: true,
      createdAt: Date.now(),
    };

    // Add to workspace
    this.workspace.hosts.push(host);
    this.workspace.hostLayouts[hostId] = {};
    this.workspace.hostWindowBounds[hostId] = {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    };
    this.workspace.hostWindowMaximized[hostId] = false;
    this.workspace.hostWindowFullscreen[hostId] = false;
    this.workspace.updatedAt = Date.now();

    this.persistence.saveWorkspace(this.workspace);

    return { hostId, host };
  }

  /**
   * Remove a satellite host.
   *
   * @param hostId - Host identifier to remove.
   * @returns Success status.
   */
  public removeSatelliteHost(hostId: string): boolean {
    // Don't allow removing main host
    if (hostId === "main") {
      return false;
    }

    // Remove host from array
    const index = this.workspace.hosts.findIndex((h) => h.id === hostId);
    if (index < 0) {
      return false;
    }

    this.workspace.hosts.splice(index, 1);

    // Clean up layouts and bounds
    delete this.workspace.hostLayouts[hostId];
    delete this.workspace.hostWindowBounds[hostId];
    delete this.workspace.hostWindowMaximized[hostId];
    delete this.workspace.hostWindowFullscreen[hostId];

    this.workspace.updatedAt = Date.now();
    this.persistence.saveWorkspace(this.workspace);

    return true;
  }

  /**
   * List all hosts (main + satellites).
   *
   * @returns Array of DockHost entries.
   */
  public listHosts(): DockHost[] {
    return [...this.workspace.hosts];
  }

  /**
   * Get a host by ID.
   *
   * @param hostId - Host identifier.
   * @returns DockHost if found, undefined otherwise.
   */
  public getHost(hostId: string): DockHost | undefined {
    return this.workspace.hosts.find((h) => h.id === hostId);
  }

  /**
   * Set host visibility.
   *
   * @param hostId - Host identifier.
   * @param isVisible - Desired visibility state.
   * @returns Updated workspace state.
   */
  public setHostVisibility(hostId: string, isVisible: boolean): WorkspaceState {
    const host = this.getHost(hostId);
    if (host) {
      host.isVisible = isVisible;
      host.lastUsedAt = Date.now();
      this.workspace.updatedAt = Date.now();
      this.persistence.saveWorkspace(this.workspace);
    }
    return this.workspace;
  }
}
