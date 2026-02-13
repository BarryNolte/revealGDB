import ace from "ace-builds";
import "ace-builds/css/ace.css";
import "ace-builds/src-noconflict/mode-assembly_arm32";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-ambiance";
import "ace-builds/src-noconflict/theme-chaos";
import "ace-builds/src-noconflict/theme-chrome";
import "ace-builds/src-noconflict/theme-cloud9_day";
import "ace-builds/src-noconflict/theme-cloud9_night";
import "ace-builds/src-noconflict/theme-cloud9_night_low_color";
import "ace-builds/src-noconflict/theme-cloud_editor";
import "ace-builds/src-noconflict/theme-cloud_editor_dark";
import "ace-builds/src-noconflict/theme-clouds";
import "ace-builds/src-noconflict/theme-clouds_midnight";
import "ace-builds/src-noconflict/theme-cobalt";
import "ace-builds/src-noconflict/theme-crimson_editor";
import "ace-builds/src-noconflict/theme-dawn";
import "ace-builds/src-noconflict/theme-dracula";
import "ace-builds/src-noconflict/theme-dreamweaver";
import "ace-builds/src-noconflict/theme-eclipse";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/theme-github_light_default";
import "ace-builds/src-noconflict/theme-gob";
import "ace-builds/src-noconflict/theme-gruvbox";
import "ace-builds/src-noconflict/theme-gruvbox_dark_hard";
import "ace-builds/src-noconflict/theme-gruvbox_light_hard";
import "ace-builds/src-noconflict/theme-idle_fingers";
import "ace-builds/src-noconflict/theme-iplastic";
import "ace-builds/src-noconflict/theme-katzenmilch";
import "ace-builds/src-noconflict/theme-kr_theme";
import "ace-builds/src-noconflict/theme-kuroir";
import "ace-builds/src-noconflict/theme-merbivore";
import "ace-builds/src-noconflict/theme-merbivore_soft";
import "ace-builds/src-noconflict/theme-mono_industrial";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/theme-nord_dark";
import "ace-builds/src-noconflict/theme-one_dark";
import "ace-builds/src-noconflict/theme-pastel_on_dark";
import "ace-builds/src-noconflict/theme-solarized_dark";
import "ace-builds/src-noconflict/theme-solarized_light";
import "ace-builds/src-noconflict/theme-sqlserver";
import "ace-builds/src-noconflict/theme-terminal";
import "ace-builds/src-noconflict/theme-textmate";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-tomorrow_night_blue";
import "ace-builds/src-noconflict/theme-tomorrow_night_bright";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import "ace-builds/src-noconflict/theme-twilight";
import "ace-builds/src-noconflict/theme-vibrant_ink";
import "ace-builds/src-noconflict/theme-xcode";
import { JSX, useCallback, useEffect, useRef, useState } from "react";
import AceEditor, { IMarker } from "react-ace";

import { gdbBreakpoint } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";

import { ContextMenuComponent } from "@syncfusion/ej2-react-navigations";
import { GdbAny } from "../../common/gdb-common";
import { menuCopy, sendTextToClipboard } from "../utilities/Clipboard";
import "./GdbSourceWindow.css";

const defaultTheme = "gruvbox";
export const editorThemes: Map<string, string> = new Map<string, string>([
  ["Ambiance", "ambiance"],
  ["Chaos", "chaos"],
  ["Chrome", "chrome"],
  ["Cloud9 Day", "cloud9_day"],
  ["Cloud9 Night", "cloud9_night"],
  ["Cloud9 Night Low Color", "cloud9_night_low_color"],
  ["Cloud Editor", "cloud_editor"],
  ["Cloud Editor Dark", "cloud_editor_dark"],
  ["Clouds", "clouds"],
  ["Clouds Midnight", "clouds_midnight"],
  ["Cobalt", "cobalt"],
  ["Crimson Editor", "crimson_editor"],
  ["Dawn", "dawn"],
  ["Dracula", "dracula"],
  ["Dreamweaver", "dreamweaver"],
  ["Eclipse", "eclipse"],
  ["Github", "github"],
  ["Github Dark", "github_dark"],
  ["Github Light Default", "github_light_default"],
  ["Gob", "gob"],
  ["Gruvbox", "gruvbox"],
  ["Gruvbox Dark Hard", "gruvbox_dark_hard"],
  ["Gruvbox Light Hard", "gruvbox_light_hard"],
  ["Idle Fingers", "idle_fingers"],
  ["iPlastic", "iplastic"],
  ["Katzenmilch", "katzenmilch"],
  ["Kr", "kr_theme"],
  ["Kuroir", "kuroir"],
  ["Merbivore", "merbivore"],
  ["Merbivore Soft", "merbivore_soft"],
  ["Mono Industrial", "mono_industrial"],
  ["Monokai", "monokai"],
  ["Nord Dark", "nord_dark"],
  ["One Dark", "one_dark"],
  ["Pastel on Dark", "pastel_on_dark"],
  ["Solarized Dark", "solarized_dark"],
  ["Solarized Light", "solarized_light"],
  ["SQL Server", "sqlserver"],
  ["Terminal", "terminal"],
  ["TextMate", "textmate"],
  ["Tomorrow", "tomorrow"],
  ["Tomorrow Night", "tomorrow_night"],
  ["Tomorrow Night Blue", "tomorrow_night_blue"],
  ["Tomorrow Night Bright", "tomorrow_night_bright"],
  ["Tomorrow Night Eighties", "tomorrow_night_eighties"],
  ["Twilight", "twilight"],
  ["Vibrant Ink", "vibrant_ink"],
  ["XCode", "xcode"],
]);

const defaultMode = "c_cpp";
export const editorModes: Map<string, string> = new Map<string, string>([
  ["c", "c_cpp"],
  ["cpp", "c_cpp"],
  ["cxx", "c_cpp"],
  ["h", "c_cpp"],
  ["hxx", "c_cpp"],
  ["cc", "c_cpp"],
  ["rs", "rust"],
  ["asm", "assembly_x86"],
  ["cs", "csharp"],
  ["d", "d"],
  ["go", "golang"],
  ["py", "python"],
  ["java", "java"],
  ["s", "assembly_arm32"],
]);

ace.config.setModuleUrl("../../node_modules", "ace-builds"); // Set base path for ace

type breakpointMarker = { line: number; type: string; file: string };
//type threadMarker = { line: number; title: string; file: string };

export default function GdbSourceWindow(): JSX.Element {
  const [source, setSource] = useState("");
  const [fullpath, setFullpath] = useState("");
  const [filename, setFilename] = useState("");
  const [line, setLine] = useState("");
  const [stackMarkers, setStackMarkers] = useState<IMarker[]>([]);
  const [currentMarker, setCurrentMarker] = useState(-1);
  const [theme, setTheme] = useState(defaultTheme);
  const [mode, setMode] = useState(defaultMode);
  const [fontSize, setFontSize] = useState(14);
  const [fontName, setFontName] = useState("monospace");
  const [lineHeight, setLineHeight] = useState(15);

  const fullFilePathRef = useRef("");
  const editorRef = useRef<AceEditor | null>(null);
  const srcViewRef = useRef<HTMLDivElement | null>(null);
  const noSrcViewRef = useRef<HTMLDivElement | null>(null);
  const gutterClickListenerRef = useRef<((e: GdbAny) => void) | null>(null);
  const breakpointsRef = useRef<breakpointMarker[]>([]);
  //const threadsRef = useRef<threadMarker[]>([]);

  const updateBreakpointMarkers = useCallback(() => {
    const session = editorRef.current?.editor.getSession();

    session?.clearBreakpoints();
    breakpointsRef.current.forEach((bp) => {
      if (bp.file === fullFilePathRef.current) {
        session?.setBreakpoint(bp.line, bp.type);
      }
    });
  }, []);

  // private addThreadMarkers() {
  //   const threadMarkers: IMarker[] = [];
  //   this.threads.forEach((thread: GdbAny) => {
  //     if (thread.file === this.fullFilePath && thread.line !== this.state.currentMarker) {
  //       const marker = {
  //         startRow: thread.line,
  //         startCol: 0,
  //         endRow: thread.line,
  //         endCol: 1,
  //         className: "ace_thread_line",
  //         type: "fullLine",
  //       } as IMarker;
  //       threadMarkers.push(marker);
  //     }
  //   });
  //   const newMarkers = this.state.stackMarkers.concat(threadMarkers);
  //   this.setState({ stackMarkers: newMarkers });
  // }

  const toggleBreakpointAtRow = useCallback((ed: ace.Ace.Editor, row: number) => {
    if (ed.getSession().getBreakpoints()[row] === undefined) {
      window.ipcToMain.sendGdbCommand(`break ${fullFilePathRef.current}:${row + 1}`);
    } else {
      window.ipcToMain.sendGdbCommand(`clear ${fullFilePathRef.current}:${row + 1}`);
    }
  }, []);

  const setupEditorCommands = useCallback(() => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.commands.addCommand({
        name: "F9_Breakpoint_Toggle",
        bindKey: { win: "F9", mac: "F9" },
        exec: (editor: ace.Ace.Editor) => {
          const row = editor.getCursorPosition().row;
          toggleBreakpointAtRow(editor, row);
        },
        readOnly: true,
      });
    }
  }, [toggleBreakpointAtRow]);

  const displayData = useCallback((data: gdbShowSourceInfo) => {
    if (data.contents) {
      setSource(data.contents);
    }
    if (data.fileName) {
      fullFilePathRef.current = data.fileName;
      setFullpath(data.fileName);
    }
    if (data.line) {
      setLine(data.line);
    }

    const baseName = data.fileName.replace(/^.*[\\/]/, "");
    setFilename(baseName);

    if (data.contents) {
      if (srcViewRef.current && noSrcViewRef.current) {
        srcViewRef.current.hidden = false;
        noSrcViewRef.current.hidden = true;
      }

      const start: number = parseInt(data.line) - 1;
      setCurrentMarker(start);

      const marker = {
        startRow: start,
        startCol: 0,
        endRow: start,
        endCol: 1,
        className: "ace_highlight_line",
        type: "fullLine",
      } as IMarker;

      setStackMarkers([marker]);
    } else {
      if (srcViewRef.current && noSrcViewRef.current) {
        srcViewRef.current.hidden = true;
        noSrcViewRef.current.hidden = false;
      }
    }
  }, []);

  const setupGutterClickListener = useCallback(() => {
    gutterClickListenerRef.current = (e: GdbAny) => {
      const target = e.domEvent.target;

      if (
        target.className.indexOf("ace_gutter-cell") === -1 ||
        !editorRef.current?.editor.isFocused() ||
        e.clientX > 25 + target.getBoundingClientRect().left
      ) {
        return;
      }

      const row = e.getDocumentPosition().row;
      toggleBreakpointAtRow(e.editor, row);
      e.stop();
    };

    if (editorRef.current?.editor && gutterClickListenerRef.current) {
      editorRef.current.editor.on("gutterclick", gutterClickListenerRef.current);
    }
  }, [toggleBreakpointAtRow]);

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
    setupEditorCommands();
    setupGutterClickListener();

    editorRef.current?.editor.setOption("showFoldWidgets", false);

    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.sourceViewerTheme) {
        const savedTheme = editorThemes.get(gdb.gui.sourceViewerTheme) || defaultTheme;
        setTheme(savedTheme);
      }

      if (gdb.gui.sourceViewerFontSize) {
        const savedFontSize = parseInt(gdb.gui.sourceViewerFontSize);
        setFontSize(savedFontSize);
        setLineHeight(savedFontSize + 1);
      }

      if (gdb.gui.sourceViewerFontName) {
        setFontName(gdb.gui.sourceViewerFontName);
      }
    });

    const unsubscribeSourceFile = window.ipcToMain.sourceFile((data: gdbShowSourceInfo) => {
      const lastPeriodIndex: number = data.fileName.lastIndexOf(".");

      let newMode: string = defaultMode;
      if (lastPeriodIndex !== -1) {
        const fileExt: string = data.fileName.slice(lastPeriodIndex + 1).toLowerCase();
        newMode = editorModes.get(fileExt) || defaultMode;
      }

      setMode(newMode);
      displayData(data);
      updateBreakpointMarkers();
      //this.addThreadMarkers();
    });

    const unsubscribeBrk = window.ipcToMain.dataBrkPts((data: Map<string, gdbBreakpoint>) => {
      breakpointsRef.current = [];
      data?.forEach((bp) => {
        const file = bp.fullname;
        const bpLine = parseInt(bp.line, 10) - 1;
        const type = bp.enabled === "y" ? "ace_breakpoint_enabled" : "ace_breakpoint_disabled";
        breakpointsRef.current.push({ line: bpLine, type: type, file: file });
      });

      updateBreakpointMarkers();
    });

    window.addEventListener("changeEditor", handleChangeEditor);

    const editor = editorRef.current?.editor;
    const gutterListener = gutterClickListenerRef.current;

    return () => {
      if (gutterListener && editor) {
        editor.off("gutterclick", gutterListener);
      }
      window.removeEventListener("changeEditor", handleChangeEditor);
      unsubscribeSourceFile();
      unsubscribeBrk();
    };
  }, [
    displayData,
    handleChangeEditor,
    setupEditorCommands,
    setupGutterClickListener,
    updateBreakpointMarkers,
  ]);

  useEffect(() => {
    if (currentMarker !== -1) {
      editorRef.current?.editor.scrollToLine(currentMarker, true, true);
    }
  }, [currentMarker]);

  const onLoad = useCallback((editor: ace.Ace.Editor) => {
    editor.clearSelection();
  }, []);

  return (
    <div className="full-size">
      <div className="full-size" ref={srcViewRef} hidden={false}>
        <div id="gdb-ace-editor" className="full-size flex-container">
          <div className="file-name flex-item-grow">{fullpath}</div>
          <AceEditor
            ref={editorRef}
            className="flex-item"
            mode={mode}
            theme={theme}
            fontSize={fontSize}
            lineHeight={lineHeight}
            onLoad={onLoad}
            value={source}
            markers={stackMarkers}
            readOnly={true}
            showPrintMargin={false}
            showGutter={true}
            name="code-editor-instance"
            setOptions={{ fontFamily: fontName }}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <ContextMenuComponent
          target="#gdb-ace-editor"
          items={menuCopy}
          select={() => {
            const text = editorRef.current?.editor.getSelectedText();
            sendTextToClipboard(text ?? "");
          }}
        />
      </div>
      <div ref={noSrcViewRef} hidden>
        <div className="no-source">
          <table className="no-source-table">
            <caption className="no-source-header">No Source Found:</caption>
            <tbody>
              <tr>
                <td className="no-source-row-header">Filename:</td>
                <td className="no-source-row-data">
                  <span className="no-source-filename">{filename}</span>
                </td>
              </tr>
              <tr>
                <td className="no-source-row-header">Line:</td>
                <td className="no-source-row-data">
                  <span className="no-source-lineno">{line}</span>
                </td>
              </tr>
              <tr>
                <td className="no-source-row-header">Full Path:</td>
                <td className="no-source-row-data">
                  <span className="no-source-fullpath">{fullpath}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div>
            <button className="no-source-button button-disassemble">Show Diassembly</button>
            <button className="no-source-button button-open-file">Open File...</button>
          </div>
        </div>
      </div>
    </div>
  );
}
