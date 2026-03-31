import { useEffect } from "react";

import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";

export type SourceIpcSubscriptionHandlers = {
  onSourceFile: (data: gdbShowSourceInfo) => void;
  onBreakpoints: (data: Map<string, gdbBreakpoint>) => void;
};

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
