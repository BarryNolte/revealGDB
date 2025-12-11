import ace from "ace-builds";
import "ace-builds/css/ace.css";
import "ace-builds/src-noconflict/mode-assembly_arm32";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-ambiance";
import "ace-builds/src-noconflict/theme-dreamweaver";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import { Component, createRef } from "react";
import AceEditor, { IMarker } from "react-ace";

import { GdbAny } from "../../common/gdb-common";
import {
  gdbBreakpoint,
  gdbThread,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";
import "./GdbSourceWindow.css";

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
    };
  }

  override componentDidMount() {
    this.setupEditorCommands();
    this.setupIPCListeners();
    this.setupGutterClickListener();
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
      this.displayData(data);
    });

    window.ipcToMain.dataBrkPts(async (data: gdbBreakpoint[]) => {
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
              mode="c_cpp"
              theme="tomorrow_night"
              fontSize={14}
              lineHeight={15}
              onLoad={this.onLoad}
              value={source}
              markers={stackMarkers}
              readOnly={true}
              showPrintMargin={false}
              showGutter={true}
              name="code-editor-instance"
              setOptions={{ fontFamily: "Consolas" }}
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
