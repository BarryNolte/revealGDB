/**
 * Implements use source ipc subscriptions behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `SourceIpcSubscriptionHandlers`, `useSourceIpcSubscriptions`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { useEffect } from "react";

import { gdbBreakpoint, gdbShowSourceInfo } from "../../common/gdb-state-types";

export type SourceIpcSubscriptionHandlers = {
  onSourceFile: (data: gdbShowSourceInfo) => void;
  onBreakpoints: (data: Map<string, gdbBreakpoint>) => void;
};

/**
 * Creates and returns the `useSourceIpcSubscriptions` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param handlers - Value for `handlers` consumed by this operation.
 */
/**
 * Performs useSourceIpcSubscriptions as part of this module's internal workflow.
 *
 * @param handlers - handlers parameter.
 * @returns The computed result produced by this operation.
 */
export function useSourceIpcSubscriptions(handlers: SourceIpcSubscriptionHandlers): void {
  const { onSourceFile, onBreakpoints } = handlers;

  useEffect(() => {
    const unsubscribeSourceFile = window.ipcToMain.debuggerData.sourceFile(onSourceFile);
    const unsubscribeBreakpoints = window.ipcToMain.debuggerData.breakpoints(onBreakpoints);

    return () => {
      unsubscribeSourceFile();
      unsubscribeBreakpoints();
    };
  }, [onBreakpoints, onSourceFile]);
}
