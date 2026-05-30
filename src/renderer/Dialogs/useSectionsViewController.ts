import { useCallback, useState } from "react";
import type { gdbSymbolFiles } from "../../common/gdb-state-types";
import type { SectionsViewOptions } from "../../common/ipc-data-types";

const DEFAULT_OPTIONS: SectionsViewOptions = { showEmptySpace: false, showLegend: false };

export type SectionsViewControllerState = {
  visible: boolean;
  symbolFiles: gdbSymbolFiles | null;
  options: SectionsViewOptions;
  showDialog: () => void;
  hideDialog: () => void;
  onOptionsChange: (opts: SectionsViewOptions) => void;
};

export function useSectionsViewController(): SectionsViewControllerState {
  const [visible, setVisible] = useState(false);
  const [symbolFiles, setSymbolFiles] = useState<gdbSymbolFiles | null>(null);
  const [options, setOptions] = useState<SectionsViewOptions>(DEFAULT_OPTIONS);

  const showDialog = useCallback(() => {
    Promise.all([
      window.ipcToMain.queries.debugger.getSectionData(),
      window.ipcToMain.queries.app.getSettings(),
    ]).then(([data, gdb]) => {
      setSymbolFiles(data);
      const sv = (gdb as { gui?: { sectionsView?: Partial<SectionsViewOptions> } })?.gui
        ?.sectionsView;
      setOptions({
        showEmptySpace: sv?.showEmptySpace ?? false,
        showLegend: sv?.showLegend ?? false,
      });
      setVisible(true);
    });
  }, []);

  const hideDialog = useCallback(() => {
    setVisible(false);
  }, []);

  const onOptionsChange = useCallback((opts: SectionsViewOptions) => {
    setOptions(opts);
    window.ipcToMain.commands.app.notifyMain({ command: "save-sections-view-options", data: opts });
  }, []);

  return { visible, symbolFiles, options, showDialog, hideDialog, onOptionsChange };
}
