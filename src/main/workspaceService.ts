/**
 * Workspace service for managing workspace state, windows, and hosts.
 *
 * @remarks
 * Handles creation, retrieval, update, and deletion of workspace entities.
 * Provides validation and normalization of workspace state.
 * Bridges between electron-store persistence and IPC requests.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  CreateWindowRequest,
  DockableWindow,
  DockHostLayout,
  MoveWindowRequest,
  UpdateWindowRequest,
  WorkspaceHost,
  WorkspaceState,
} from "../common/workspace-types";
import { WindowDisplayMode } from "../common/workspace-types";

/**
 * Default workspace ID used when single workspace is expected.
 */
const DEFAULT_WORKSPACE_ID = "default-workspace";

/**
 * Service class for workspace state management.
 *
 * @remarks
 * Provides methods for workspace CRUD operations, validation, and normalization.
 * Does not handle persistence directly; callers pass store/state objects.
 */
export class WorkspaceService {
  /**
   * Creates a new empty workspace state.
   *
   * @param id - Optional workspace identifier (defaults to constant)
   * @returns Initialized workspace state
   */
  public static createEmptyWorkspace(id?: string): WorkspaceState {
    return {
      id: id ?? DEFAULT_WORKSPACE_ID,
      windows: [],
      hosts: [
        {
          id: "main",
          label: "Main Window",
          visibleWindows: [],
        },
      ],
      hostLayouts: {},
      updatedAt: Date.now(),
    };
  }

  /**
   * Validates workspace state structure.
   *
   * @param state - Workspace state to validate
   * @returns true if valid, false otherwise
   *
   * @remarks
   * Checks that all required fields exist and have correct types.
   * Does not validate referential integrity (e.g., window IDs exist).
   */
  public static validateWorkspaceState(state: unknown): state is WorkspaceState {
    if (!state || typeof state !== "object") {
      return false;
    }

    const ws = state as Record<string, unknown>;

    if (
      typeof ws.id !== "string" ||
      !Array.isArray(ws.windows) ||
      !Array.isArray(ws.hosts) ||
      typeof ws.hostLayouts !== "object" ||
      typeof ws.updatedAt !== "number"
    ) {
      return false;
    }

    // Validate windows array structure
    const windows = ws.windows as unknown[];
    if (
      !windows.every(
        (w) =>
          typeof w === "object" &&
          w !== null &&
          typeof (w as Record<string, unknown>).id === "string" &&
          typeof (w as Record<string, unknown>).title === "string" &&
          typeof (w as Record<string, unknown>).body === "string" &&
          typeof (w as Record<string, unknown>).isVisible === "boolean",
      )
    ) {
      return false;
    }

    // Validate hosts array structure
    const hosts = ws.hosts as unknown[];
    if (
      !hosts.every(
        (h) =>
          typeof h === "object" &&
          h !== null &&
          typeof (h as Record<string, unknown>).id === "string" &&
          typeof (h as Record<string, unknown>).label === "string" &&
          Array.isArray((h as Record<string, unknown>).visibleWindows),
      )
    ) {
      return false;
    }

    return true;
  }

  /**
   * Normalizes workspace state by removing orphaned references and ensuring consistency.
   *
   * @param state - Workspace state to normalize
   * @returns Normalized workspace state
   *
   * @remarks
   * - Removes window IDs from host visibleWindows if window doesn't exist
   * - Clears layout entries for non-existent hosts
   * - Ensures at least one host exists
   */
  public static normalizeWorkspaceState(state: WorkspaceState): WorkspaceState {
    const windowIds = new Set(state.windows.map((w) => w.id));
    const hostIds = new Set(state.hosts.map((h) => h.id));

    // Clean up orphaned window IDs in hosts while preserving host-to-window membership.
    const cleanedHosts = state.hosts.map((host) => ({
      ...host,
      visibleWindows: host.visibleWindows.filter((id) => windowIds.has(id)),
    }));

    const normalizedWindows = state.windows.map((window) => {
      const hostFromList = cleanedHosts.find((host) => host.visibleWindows.includes(window.id));
      const storedHostId =
        typeof window.windowState?.hostId === "string" ? window.windowState.hostId : undefined;
      const resolvedHostId =
        storedHostId && hostIds.has(storedHostId) ? storedHostId : (hostFromList?.id ?? "main");

      return {
        ...window,
        windowState: {
          ...(window.windowState ?? {}),
          hostId: resolvedHostId,
        },
      };
    });

    const hostWindowMap = new Map<string, Set<string>>();
    for (const window of normalizedWindows) {
      const hostId =
        typeof window.windowState?.hostId === "string" ? window.windowState.hostId : undefined;
      if (!hostId || !hostIds.has(hostId)) {
        continue;
      }

      const assignedWindowIds = hostWindowMap.get(hostId) ?? new Set<string>();
      assignedWindowIds.add(window.id);
      hostWindowMap.set(hostId, assignedWindowIds);
    }

    const resolvedHosts = cleanedHosts.map((host) => ({
      ...host,
      visibleWindows: Array.from(
        new Set([
          ...host.visibleWindows,
          ...(hostWindowMap.get(host.id) ? Array.from(hostWindowMap.get(host.id) ?? []) : []),
        ]),
      ),
    }));

    // Remove layouts for non-existent hosts
    const cleanedLayouts: Record<string, DockHostLayout> = {};
    Object.entries(state.hostLayouts).forEach(([hostId, layout]) => {
      if (hostIds.has(hostId)) {
        cleanedLayouts[hostId] = layout;
      }
    });

    // Ensure at least one host exists
    if (resolvedHosts.length === 0) {
      resolvedHosts.push({
        id: "main",
        label: "Main Window",
        visibleWindows: [],
      });
    }

    return {
      ...state,
      windows: normalizedWindows,
      hosts: resolvedHosts,
      hostLayouts: cleanedLayouts,
      updatedAt: Date.now(),
    };
  }

  /**
   * Creates a new window in the workspace.
   *
   * @param state - Current workspace state
   * @param request - Window creation request
   * @returns Updated workspace state with new window
   */
  public static createWindow(state: WorkspaceState, request: CreateWindowRequest): WorkspaceState {
    const hostId = request.windowState?.hostId ?? "main";
    const normalizedHostId = state.hosts.some((host) => host.id === hostId)
      ? hostId
      : (state.hosts[0]?.id ?? "main");

    const newWindow: DockableWindow = {
      id: uuidv4(),
      title: request.title,
      body: request.body,
      type: request.type,
      group: request.group,
      isVisible: request.isVisible ?? true,
      displayMode: request.displayMode ?? WindowDisplayMode.Docked,
      windowState: {
        ...(request.windowState ?? {}),
        hostId: normalizedHostId,
      },
    };

    const updatedHosts = state.hosts.map((host) =>
      host.id === normalizedHostId
        ? {
            ...host,
            visibleWindows: [...new Set([...host.visibleWindows, newWindow.id])],
          }
        : host,
    );

    return WorkspaceService.normalizeWorkspaceState({
      ...state,
      windows: [...state.windows, newWindow],
      hosts: updatedHosts,
      updatedAt: Date.now(),
    });
  }

  /**
   * Retrieves a window by ID.
   *
   * @param state - Workspace state
   * @param windowId - ID of window to retrieve
   * @returns Window object or undefined if not found
   */
  public static getWindow(state: WorkspaceState, windowId: string): DockableWindow | undefined {
    return state.windows.find((w) => w.id === windowId);
  }

  /**
   * Updates a window's properties.
   *
   * @param state - Current workspace state
   * @param windowId - ID of window to update
   * @param request - Update request (partial window fields)
   * @returns Updated workspace state
   *
   * @remarks
   * Returns state unchanged if window not found.
   */
  public static updateWindow(
    state: WorkspaceState,
    windowId: string,
    request: UpdateWindowRequest,
  ): WorkspaceState {
    const windowIndex = state.windows.findIndex((w) => w.id === windowId);
    if (windowIndex === -1) {
      return state;
    }

    const updated = [...state.windows];
    updated[windowIndex] = {
      ...updated[windowIndex],
      ...request,
    };

    return {
      ...state,
      windows: updated,
      updatedAt: Date.now(),
    };
  }

  /**
   * Deletes a window from the workspace.
   *
   * @param state - Current workspace state
   * @param windowId - ID of window to delete
   * @returns Updated workspace state
   *
   * @remarks
   * Also removes window ID from all host visibleWindows arrays.
   */
  public static deleteWindow(state: WorkspaceState, windowId: string): WorkspaceState {
    const cleanedHosts = state.hosts.map((host) => ({
      ...host,
      visibleWindows: host.visibleWindows.filter((id) => id !== windowId),
    }));

    return {
      ...state,
      windows: state.windows.filter((w) => w.id !== windowId),
      hosts: cleanedHosts,
      updatedAt: Date.now(),
    };
  }

  /**
   * Retrieves all windows for a given host.
   *
   * @param state - Workspace state
   * @param hostId - ID of host
   * @returns Array of windows visible on that host
   */
  public static getWindowsForHost(state: WorkspaceState, hostId: string): DockableWindow[] {
    const host = state.hosts.find((h) => h.id === hostId);
    if (!host) {
      return [];
    }

    return host.visibleWindows
      .map((windowId) => state.windows.find((w) => w.id === windowId))
      .filter((w) => w !== undefined) as DockableWindow[];
  }

  /**
   * Moves a window to a different host.
   *
   * @param state - Current workspace state
   * @param request - Move window request
   * @returns Updated workspace state
   *
   * @remarks
   * Returns state unchanged if window or target host not found.
   * Removes window from old host and adds to new host.
   */
  public static moveWindowToHost(
    state: WorkspaceState,
    request: MoveWindowRequest,
  ): WorkspaceState {
    const window = state.windows.find((w) => w.id === request.windowId);
    const targetHost = state.hosts.find((h) => h.id === request.targetHostId);

    if (!window || !targetHost) {
      return state;
    }

    const updatedHosts = state.hosts.map((host) => ({
      ...host,
      visibleWindows:
        host.id === request.targetHostId
          ? !host.visibleWindows.includes(request.windowId)
            ? [...host.visibleWindows, request.windowId]
            : host.visibleWindows
          : host.visibleWindows.filter((id) => id !== request.windowId),
    }));

    const updatedWindows = state.windows.map((candidate) =>
      candidate.id === request.windowId
        ? {
            ...candidate,
            windowState: {
              ...(candidate.windowState ?? {}),
              hostId: request.targetHostId,
            },
          }
        : candidate,
    );

    return {
      ...state,
      windows: updatedWindows,
      hosts: updatedHosts,
      updatedAt: Date.now(),
    };
  }

  /**
   * Sets the layout for a specific host.
   *
   * @param state - Current workspace state
   * @param hostId - ID of host
   * @param layout - Serialized dock-spawn-ts layout
   * @returns Updated workspace state
   */
  public static setHostLayout(
    state: WorkspaceState,
    hostId: string,
    layout: DockHostLayout,
  ): WorkspaceState {
    return {
      ...state,
      hostLayouts: {
        ...state.hostLayouts,
        [hostId]: layout,
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Retrieves the layout for a specific host.
   *
   * @param state - Workspace state
   * @param hostId - ID of host
   * @returns Serialized layout or undefined if not found
   */
  public static getHostLayout(state: WorkspaceState, hostId: string): DockHostLayout | undefined {
    return state.hostLayouts[hostId];
  }

  /**
   * Creates a new host in the workspace.
   *
   * @param state - Current workspace state
   * @param id - Optional host ID (defaults to generated)
   * @param label - Optional host label (defaults to auto-generated)
   * @returns Updated workspace state with new host
   */
  public static createHost(state: WorkspaceState, id?: string, label?: string): WorkspaceState {
    const newHostId = id ?? `dock-${uuidv4().slice(0, 8)}`;
    const dockWindowCount = state.hosts.filter((h) => h.id.startsWith("dock-")).length + 1;
    const newHostLabel = label ?? `Dock Window ${dockWindowCount}`;

    const newHost: WorkspaceHost = {
      id: newHostId,
      label: newHostLabel,
      visibleWindows: [],
    };

    return {
      ...state,
      hosts: [...state.hosts, newHost],
      updatedAt: Date.now(),
    };
  }

  /**
   * Retrieves a host by ID.
   *
   * @param state - Workspace state
   * @param hostId - ID of host
   * @returns Host object or undefined if not found
   */
  public static getHost(state: WorkspaceState, hostId: string): WorkspaceHost | undefined {
    return state.hosts.find((h) => h.id === hostId);
  }

  /**
   * Deletes a host from the workspace.
   *
   * @param state - Current workspace state
   * @param hostId - ID of host to delete
   * @returns Updated workspace state
   *
   * @remarks
   * Windows assigned to deleted host are reassigned to main host.
   * Layout entry for deleted host is removed.
   * Main host cannot be deleted.
   */
  private static mergeDockLayouts(
    baseLayout: DockHostLayout | undefined,
    incomingLayout: DockHostLayout | undefined,
  ): DockHostLayout | undefined {
    if (!baseLayout) {
      return incomingLayout;
    }

    if (!incomingLayout) {
      return baseLayout;
    }

    const isPlainObject = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === "object" && !Array.isArray(value);

    const mergeValues = (left: unknown, right: unknown): unknown => {
      if (Array.isArray(left) && Array.isArray(right)) {
        const mergedItems = [...left];
        for (const item of right) {
          const alreadyExists = mergedItems.some(
            (existingItem) => JSON.stringify(existingItem) === JSON.stringify(item),
          );
          if (!alreadyExists) {
            mergedItems.push(item);
          }
        }
        return mergedItems;
      }

      if (isPlainObject(left) && isPlainObject(right)) {
        const mergedObject: Record<string, unknown> = { ...left };
        for (const [key, value] of Object.entries(right)) {
          if (!Object.prototype.hasOwnProperty.call(mergedObject, key)) {
            mergedObject[key] = value;
            continue;
          }
          mergedObject[key] = mergeValues(mergedObject[key], value);
        }
        return mergedObject;
      }

      return left ?? right;
    };

    return mergeValues(baseLayout, incomingLayout) as DockHostLayout | undefined;
  }

  public static deleteHost(state: WorkspaceState, hostId: string): WorkspaceState {
    if (hostId === "main") {
      return state; // Prevent deletion of main host
    }

    const hostToDelete = state.hosts.find((h) => h.id === hostId);
    if (!hostToDelete) {
      return state;
    }

    const deletedLayout = state.hostLayouts[hostId];

    const updatedWindows = state.windows.map((window) =>
      hostToDelete.visibleWindows.includes(window.id)
        ? {
            ...window,
            windowState: {
              ...(window.windowState ?? {}),
              hostId: "main",
            },
          }
        : window,
    );

    // Move windows from deleted host to main host so they remain visible after recovery.
    const updatedHosts = state.hosts
      .filter((h) => h.id !== hostId)
      .map((host) =>
        host.id === "main"
          ? {
              ...host,
              visibleWindows: [
                ...new Set([...host.visibleWindows, ...hostToDelete.visibleWindows]),
              ],
            }
          : host,
      );

    const updatedLayouts = { ...state.hostLayouts };
    delete updatedLayouts[hostId];

    // Preserve the closed host's panes by merging its layout into the primary host layout.
    // The primary host should keep its own layout while absorbing the secondary host's panel
    // state so the user never loses the docked panes when a satellite window is closed.
    if (deletedLayout && Object.keys(deletedLayout).length > 0) {
      updatedLayouts.main =
        WorkspaceService.mergeDockLayouts(updatedLayouts.main, deletedLayout) ??
        updatedLayouts.main;
    }

    return {
      ...state,
      windows: updatedWindows,
      hosts: updatedHosts,
      hostLayouts: updatedLayouts,
      updatedAt: Date.now(),
    };
  }

  /**
   * Generates a fallback layout for GDB tool windows.
   *
   * @remarks
   * Used when no saved layout exists. Creates a smart placement:
   * - Source window fills center (documents)
   * - Locals, Threads, Disassembly positioned on sides
   * - Memory, Registers, Breakpoints on bottom/right
   * - Callstack and Functions in fill positions
   *
   * @returns Mock DockHostLayout object (structure matches dock-spawn-ts output)
   */
  public static createFallbackGdbLayout(): DockHostLayout {
    // This is a simplified placeholder that will be expanded in Phase 3
    // When DockWorkspace component is created, this will generate actual layout instructions
    return {
      // Placeholder: actual structure will depend on dock-spawn-ts internals
      // This will be populated during Phase 3 implementation
      type: "fallback",
      version: 1,
    };
  }
}
