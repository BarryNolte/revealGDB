/**
 * Implements use source editor settings behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `SourceEditorSettings`, `useSourceEditorSettings`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { useCallback, useEffect, useState } from "react";

import type { GdbSettings } from "../../common/settings-types";
import { defaultTheme, editorThemes } from "./GdbSourceEditorConfig";

export type SourceEditorSettings = {
  theme: string;
  fontSize: number;
  lineHeight: number;
  fontName: string;
};

/**
 * Creates and returns the `useSourceEditorSettings` hook API used by renderer components.
 *
 * @remarks
 * Encapsulates stateful React logic and returns values/callbacks consumed by UI components. Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @returns The computed result produced by this operation.
 */
export function useSourceEditorSettings(): SourceEditorSettings {
  const [theme, setTheme] = useState(defaultTheme);
  const [fontSize, setFontSize] = useState(14);
  const [fontName, setFontName] = useState("monospace");
  const [lineHeight, setLineHeight] = useState(15);

  const handleChangeEditor = useCallback((e: Event) => {
    const ev = e as CustomEvent;
    if (ev.detail.theme) {
      const newTheme = editorThemes.get(ev.detail.theme) || defaultTheme;
      setTheme(newTheme);
    }
    if (ev.detail.fontSize) {
      setFontSize(ev.detail.fontSize);
      setLineHeight(ev.detail.fontSize + 1);
    }
    if (ev.detail.fontName) {
      setFontName(ev.detail.fontName);
    }
  }, []);

  useEffect(() => {
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbSettings): void => {
      if (gdb.gui?.sourceViewerTheme) {
        const savedTheme = editorThemes.get(gdb.gui.sourceViewerTheme) || defaultTheme;
        setTheme(savedTheme);
      }

      if (gdb.gui?.sourceViewerFontSize) {
        const savedFontSize = Number.parseInt(gdb.gui.sourceViewerFontSize, 10);
        setFontSize(savedFontSize);
        setLineHeight(savedFontSize + 1);
      }

      if (gdb.gui?.sourceViewerFontName) {
        setFontName(gdb.gui.sourceViewerFontName);
      }
    });

    window.addEventListener("changeEditor", handleChangeEditor);
    return () => {
      window.removeEventListener("changeEditor", handleChangeEditor);
    };
  }, [handleChangeEditor]);

  return {
    theme,
    fontSize,
    lineHeight,
    fontName,
  };
}
