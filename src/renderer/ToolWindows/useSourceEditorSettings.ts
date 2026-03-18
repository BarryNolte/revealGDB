import { useCallback, useEffect, useState } from "react";

import { GdbAny } from "../../common/gdb-common";
import { defaultTheme, editorThemes } from "./GdbSourceEditorConfig";

export type SourceEditorSettings = {
  theme: string;
  fontSize: number;
  lineHeight: number;
  fontName: string;
};

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
    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.sourceViewerTheme) {
        const savedTheme = editorThemes.get(gdb.gui.sourceViewerTheme) || defaultTheme;
        setTheme(savedTheme);
      }

      if (gdb.gui.sourceViewerFontSize) {
        const savedFontSize = Number.parseInt(gdb.gui.sourceViewerFontSize, 10);
        setFontSize(savedFontSize);
        setLineHeight(savedFontSize + 1);
      }

      if (gdb.gui.sourceViewerFontName) {
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
