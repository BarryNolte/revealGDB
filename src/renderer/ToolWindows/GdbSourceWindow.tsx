import ace from "ace-builds";
import "ace-builds/css/ace.css";
import "ace-builds/src-noconflict/mode-assembly_arm32";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/movde-java";
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
import { Component, createRef } from "react";
import AceEditor, { IMarker } from "react-ace";

import {
  gdbBreakpoint,
  gdbThread,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";

import { GdbAny } from "../../common/gdb-common";
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

type breakpointMarker = { line: number; type: string };
type threadMarker = { line: number; title: string; path: string };

interface GdbSourceWindowState {
  source: string;
  fullpath: string;
  filename: string;
  line: string;
  stackMarkers: IMarker[];
  currentMarker: number;
  breakpoints: breakpointMarker[];
  threads: threadMarker[];
  theme: string;
  mode: string;
  fontSize: number;
  fontName: string;
  lineHeight: number;
}

export default class GdbSourceWindow extends Component<
  Record<string, never>,
  GdbSourceWindowState
> {
  private fullFilePath: string = "";
  private editorRef = createRef<AceEditor>();
  private srcViewRef = createRef<HTMLDivElement>();
  private noSrcViewRef = createRef<HTMLDivElement>();
  private gutterClickListener: ((e: GdbAny) => void) | null = null;

  constructor(props: Record<string, never>) {
    super(props);
    this.state = {
      source: "",
      fullpath: "",
      filename: "",
      line: "",
      stackMarkers: [],
      currentMarker: -1,
      breakpoints: [],
      threads: [],
      theme: defaultTheme,
      mode: defaultMode,
      fontName: "monospace",
      fontSize: 14,
      lineHeight: 15,
    };
  }

  override componentDidMount() {
    this.setupEditorCommands();
    this.setupIPCListeners();
    this.setupGutterClickListener();

    this.editorRef.current?.editor.setOption("showFoldWidgets", false);

    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      if (gdb.gui.sourceViewerTheme) {
        const savedTheme = editorThemes.get(gdb.gui.sourceViewerTheme) || defaultTheme;
        this.setState({ theme: savedTheme });
      }

      if (gdb.gui.sourceViewerFontSize) {
        const savedFontSize = parseInt(gdb.gui.sourceViewerFontSize);
        this.setState({ fontSize: savedFontSize });
        this.setState({ lineHeight: savedFontSize + 1 });
      }

      if (gdb.gui.sourceViewerFontName) {
        this.setState({ fontName: gdb.gui.sourceViewerFontName });
      }
    });

    window.addEventListener("changeEditor", (e: Event) => {
      const ev = e as CustomEvent;
      if (ev.detail.theme) {
        const newTheme = editorThemes.get(ev.detail.theme) || defaultTheme;
        this.setState({ theme: newTheme });
      }
      if (ev.detail.fontSize) {
        this.setState({ fontSize: ev.detail.fontSize });
        this.setState({ lineHeight: ev.detail.fontSize + 1 });
      }
      if (ev.detail.fontName) {
        this.setState({ fontName: ev.detail.fontName });
      }
    });
  }

  override componentDidUpdate(prevProps: Record<string, never>, prevState: GdbSourceWindowState) {
    // Update breakpoint markers when breakpoints or source changes
    if (
      prevState.breakpoints !== this.state.breakpoints ||
      prevState.source !== this.state.source
    ) {
      this.updateBreakpointMarkers();
    }

    // Scroll to current marker when it changes
    if (prevState.currentMarker !== this.state.currentMarker) {
      this.editorRef.current?.editor.scrollToLine(this.state.currentMarker, true, true);
    }
  }

  override componentWillUnmount() {
    if (this.gutterClickListener && this.editorRef.current?.editor) {
      this.editorRef.current.editor.off("gutterclick", this.gutterClickListener);
    }
  }

  private setupEditorCommands() {
    if (this.editorRef.current?.editor) {
      this.editorRef.current.editor.commands.addCommand({
        name: "F9_Breakpoint_Toggle",
        bindKey: { win: "F9", mac: "F9" },
        exec: (editor: ace.Ace.Editor) => {
          const row = editor.getCursorPosition().row;
          this.toggleBreakpointAtRow(editor, row);
        },
        readOnly: true,
      });
    }
  }

  private setupIPCListeners() {
    window.ipcToMain.sourceFile((data: gdbShowSourceInfo) => {
      const lastPeriodIndex: number = data.fileName.lastIndexOf(".");

      let newMode: string = defaultMode;
      if (lastPeriodIndex !== -1) {
        const fileExt: string = data.fileName.slice(lastPeriodIndex + 1).toLowerCase();
        newMode = editorModes.get(fileExt) || defaultMode;
      }

      this.setState({ mode: newMode });
      this.displayData(data);
    });

    window.ipcToMain.dataBrkPts((data: gdbBreakpoint[]) => {
      const newBreakpoints: breakpointMarker[] = [];
      data?.forEach((bp) => {
        if (bp.fullname === this.state.fullpath) {
          const bpLine = parseInt(bp.line, 10) - 1;
          const type = bp.enabled === "y" ? "ace_breakpoint_enabled" : "ace_breakpoint_disabled";
          newBreakpoints.push({ line: bpLine, type });
        }
      });
      this.setState({ breakpoints: newBreakpoints });
    });

    window.ipcToMain.dataThreads((data: GdbAny) => {
      const newThreads: threadMarker[] = [];
      data.grp.forEach(() => {
        data.th.forEach((thread: gdbThread) => {
          newThreads.push({
            line: parseInt(thread.frame.line, 10) - 1,
            title: `${thread.name}:${thread.frame.func}:${thread.frame.line}`,
            path: thread.frame.fullName,
          });
        });
      });
      this.setState({ threads: newThreads });
    });
  }

  private setupGutterClickListener() {
    this.gutterClickListener = (e: GdbAny) => {
      const target = e.domEvent.target;

      if (
        target.className.indexOf("ace_gutter-cell") === -1 ||
        !this.editorRef.current?.editor.isFocused() ||
        e.clientX > 25 + target.getBoundingClientRect().left
      ) {
        return;
      }

      const row = e.getDocumentPosition().row;
      this.toggleBreakpointAtRow(e.editor, row);
      e.stop();
    };

    if (this.editorRef.current?.editor) {
      this.editorRef.current.editor.on("gutterclick", this.gutterClickListener);
    }
  }

  private updateBreakpointMarkers() {
    this.editorRef.current?.editor.getSession().clearBreakpoints();
    this.state.breakpoints.forEach((bp) => {
      this.editorRef.current?.editor.getSession().setBreakpoint(bp.line, bp.type);
    });
  }

  private toggleBreakpointAtRow(ed: ace.Ace.Editor, row: number) {
    if (ed.getSession().getBreakpoints()[row] === undefined) {
      window.ipcToMain.sendGdbCommand(`break ${this.fullFilePath}:${row + 1}`);
    } else {
      window.ipcToMain.sendGdbCommand(`clear ${this.fullFilePath}:${row + 1}`);
    }
  }

  private displayData = (data: gdbShowSourceInfo) => {
    if (data.contents) {
      this.setState({ source: data.contents });
    }
    if (data.fileName) {
      this.fullFilePath = data.fileName;
      this.setState({ fullpath: data.fileName });
    }
    if (data.line) {
      this.setState({ line: data.line });
    }

    const baseName = data.fileName.replace(/^.*[\\/]/, "");
    this.setState({ filename: baseName });

    if (data.contents) {
      // Have source
      if (this.srcViewRef.current && this.noSrcViewRef.current) {
        this.srcViewRef.current.hidden = false;
        this.noSrcViewRef.current.hidden = true;
      }

      const start: number = parseInt(data.line) - 1;
      this.setState({ currentMarker: start });

      const marker = {
        startRow: start,
        startCol: 0,
        endRow: start,
        endCol: 1,
        className: "ace_highlight_line",
        type: "fullLine",
      } as IMarker;

      this.setState({ stackMarkers: [marker] });
    } else {
      // No source
      if (this.srcViewRef.current && this.noSrcViewRef.current) {
        this.srcViewRef.current.hidden = true;
        this.noSrcViewRef.current.hidden = false;
      }
    }
  };

  private onLoad = (editor: ace.Ace.Editor) => {
    editor.clearSelection();
  };

  override render() {
    const { source, fullpath, filename, line, stackMarkers } = this.state;

    return (
      <div className="full-size">
        <div className="full-size" ref={this.srcViewRef} hidden={false}>
          <div className="full-size flex-container">
            <div className="file-name flex-item-grow">{fullpath}</div>
            <AceEditor
              className="flex-item"
              ref={this.editorRef}
              mode={this.state.mode}
              theme={this.state.theme}
              fontSize={this.state.fontSize}
              lineHeight={this.state.lineHeight}
              onLoad={this.onLoad}
              value={source}
              markers={stackMarkers}
              readOnly={true}
              showPrintMargin={false}
              showGutter={true}
              name="code-editor-instance"
              setOptions={{ fontFamily: this.state.fontName }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>
        <div ref={this.noSrcViewRef}>
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
}
