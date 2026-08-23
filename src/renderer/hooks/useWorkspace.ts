/**
 * Custom React hook for accessing and managing workspace state.
 *
 * @remarks
 * Provides access to the workspace state, including dockable windows, groups, and operations
 * to create, move, and control window visibility. Auto-subscribes to workspace updates.
 *
 * @example
 * ```tsx
 * const { workspace, createWindow, moveWindow } = useWorkspace();
 * ```
 */
import { useCallback, useEffect, useState } from "react";
import type {
  CreateWindowRequest,
  MoveWindowRequest,
  SaveHostLayoutRequest,
  SetWindowVisibilityRequest,
  WorkspaceState,
} from "../../common/workspace-types";
import type { IElectronAPI } from "../../preload/interface";

// Type guard to access ipcToMain from window
declare const window: {
  ipcToMain: IElectronAPI;
} & Window;

/**
 * Hook for accessing workspace state and operations.
 * @returns Object containing workspace state and command functions
 */
// eslint-disable-next-line max-lines-per-function
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Load initial workspace state
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setIsLoading(true);
        const state = await window.ipcToMain.getWorkspaceState();
        setWorkspace(state);
        setError(undefined);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error("Failed to load workspace state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, []);

  // Subscribe to workspace updates
  useEffect(() => {
    const unsubscribe = window.ipcToMain.workspaceUpdated((updatedWorkspace) => {
      setWorkspace(updatedWorkspace);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Creates a new dockable window.
   */
  const createWindow = useCallback(async (request: CreateWindowRequest) => {
    try {
      const updatedWorkspace = await window.ipcToMain.createDockableWindow(request);
      setWorkspace(updatedWorkspace);
      return updatedWorkspace;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to create window:", error);
      throw error;
    }
  }, []);

  /**
   * Moves a window to a different group.
   */
  const moveWindow = useCallback(async (request: MoveWindowRequest) => {
    try {
      const updatedWorkspace = await window.ipcToMain.moveWindow(request);
      setWorkspace(updatedWorkspace);
      return updatedWorkspace;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to move window:", error);
      throw error;
    }
  }, []);

  /**
   * Sets the visibility of a window.
   */
  const setWindowVisibility = useCallback(async (request: SetWindowVisibilityRequest) => {
    try {
      const updatedWorkspace = await window.ipcToMain.setWindowVisibility(request);
      setWorkspace(updatedWorkspace);
      return updatedWorkspace;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to set window visibility:", error);
      throw error;
    }
  }, []);

  /**
   * Saves the dock layout for a host.
   */
  const saveHostLayout = useCallback(async (request: SaveHostLayoutRequest) => {
    try {
      const result = await window.ipcToMain.saveDockLayout(request);
      setWorkspace(result.workspace);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to save host layout:", error);
      throw error;
    }
  }, []);

  /**
   * Finds a window by ID.
   */
  const getWindow = useCallback(
    (windowId: string) => {
      if (!workspace) return undefined;
      return workspace.windows.find((w) => w.id === windowId);
    },
    [workspace],
  );

  /**
   * Finds windows in a specific group.
   */
  const getWindowsInGroup = useCallback(
    (group: "documents" | "toolwindows") => {
      if (!workspace) return [];
      return workspace.windows.filter((w) => w.group === group);
    },
    [workspace],
  );

  /**
   * Gets visible windows in a specific group.
   */
  const getVisibleWindowsInGroup = useCallback(
    (group: "documents" | "toolwindows") => {
      if (!workspace) return [];
      return workspace.windows.filter((w) => w.group === group && w.isVisible);
    },
    [workspace],
  );

  return {
    // State
    workspace,
    isLoading,
    error,

    // Commands
    createWindow,
    moveWindow,
    setWindowVisibility,
    saveHostLayout,

    // Queries
    getWindow,
    getWindowsInGroup,
    getVisibleWindowsInGroup,
  };
}
