/**
 * Custom React hook for managing individual window visibility.
 *
 * @remarks
 * Provides a simplified interface for toggling window visibility and managing
 * window state in a specific group.
 *
 * @example
 * ```tsx
 * const { isVisible, toggle, show, hide } = useWindowVisibility('my-window-id', 'toolwindows');
 * ```
 */
import { useCallback, useEffect, useState } from "react";
import type { SetWindowVisibilityRequest } from "../../common/workspace-types";
import type { IElectronAPI } from "../../preload/interface";

// Type guard to access ipcToMain from window
declare const window: {
  ipcToMain: IElectronAPI;
} & Window;

/**
 * Hook for managing visibility of a specific window.
 * @param windowId - The ID of the window to manage
 * @param defaultGroup - The group to return window to when showing (optional)
 * @returns Object containing visibility state and control functions
 */
// eslint-disable-next-line max-lines-per-function
export function useWindowVisibility(windowId: string, defaultGroup?: "documents" | "toolwindows") {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  /**
   * Toggles window visibility.
   */
  const toggle = useCallback(async () => {
    try {
      setIsLoading(true);
      const request: SetWindowVisibilityRequest = {
        windowId,
        isVisible: !isVisible,
      };
      if (!isVisible && defaultGroup) {
        request.group = defaultGroup;
      }
      await window.ipcToMain.setWindowVisibility(request);
      setIsVisible(!isVisible);
      setError(undefined);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to toggle window visibility:", error);
    } finally {
      setIsLoading(false);
    }
  }, [windowId, isVisible, defaultGroup]);

  /**
   * Shows the window.
   */
  const show = useCallback(async () => {
    if (isVisible) return;

    try {
      setIsLoading(true);
      const request: SetWindowVisibilityRequest = {
        windowId,
        isVisible: true,
      };
      if (defaultGroup) {
        request.group = defaultGroup;
      }
      await window.ipcToMain.setWindowVisibility(request);
      setIsVisible(true);
      setError(undefined);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to show window:", error);
    } finally {
      setIsLoading(false);
    }
  }, [windowId, isVisible, defaultGroup]);

  /**
   * Hides the window.
   */
  const hide = useCallback(async () => {
    if (!isVisible) return;

    try {
      setIsLoading(true);
      const request: SetWindowVisibilityRequest = {
        windowId,
        isVisible: false,
      };
      await window.ipcToMain.setWindowVisibility(request);
      setIsVisible(false);
      setError(undefined);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("Failed to hide window:", error);
    } finally {
      setIsLoading(false);
    }
  }, [windowId, isVisible]);

  /**
   * Subscribes to workspace updates to sync visibility state.
   */
  useEffect(() => {
    const unsubscribe = window.ipcToMain.workspaceUpdated((workspace) => {
      const window_obj = workspace.windows.find((w) => w.id === windowId);
      if (window_obj) {
        setIsVisible(window_obj.isVisible);
      }
    });

    return () => unsubscribe();
  }, [windowId]);

  return {
    // State
    isVisible,
    isLoading,
    error,

    // Commands
    toggle,
    show,
    hide,
  };
}
