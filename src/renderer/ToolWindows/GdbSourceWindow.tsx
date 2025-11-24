import * as React from "react";
import { useEffect, useRef, useState } from "react";
import AceEditor, { IMarker } from "react-ace";
import ace from "ace-builds";
import "ace-builds/css/ace.css";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-assembly_arm32";
import "ace-builds/src-noconflict/mode-assembly_x86";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-ambiance";
import "ace-builds/src-noconflict/theme-dreamweaver";
import "ace-builds/src-noconflict/theme-tomorrow_night";

import "./GdbSourceWindow.css";
import { gdbShowSourceInfo } from "../../main/mi-interface/mi-interface";
import {
  gdbBreakpoint,
  gdbThread,
} from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";
import { GdbAny } from "../../common/gdb-common";

ace.config.setModuleUrl("../../node_modules", "ace-builds"); // Set base path for ace

type breakpointMarker = { line: number; type: string };
type threadMarker = { line: number; title: string; path: string };

let fullFilePath: string = "";

function GdbSourceWindow() {
  const [source, setSource] = useState<string>("");
  const [fullpath, setFullpath] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [line, setLine] = useState<string>("");
  const [stackMarkers, setStackMarkers] = useState<IMarker[]>([]);
  const [currentMarker, setCurrentMarker] = useState<number>(-1);
  const [breakpoints, setBreakpoints] = useState<breakpointMarker[]>([]);
  const [threads, setThreads] = useState<threadMarker[]>([]);

  const editorRef = useRef<AceEditor>(null);
  const srcViewRef = useRef<HTMLDivElement>(null);
  const noSrcViewRef = useRef<HTMLDivElement>(null);

  editorRef.current?.editor.commands.addCommand({
    name: "F9_Breakpoint_Toggle",
    bindKey: { win: "F9", mac: "F9" }, // Bind F5 for both Windows and Mac
    exec: function (editor: ace.Ace.Editor) {
      const row = editor.getCursorPosition().row;

      toggleBreakpointAtRow(editor, row);
    },
    readOnly: true, // Optional: Set to true if the command should not modify editor content
  });

  window.ipcToMain.sourceFile((data: gdbShowSourceInfo) => {
    displayData(data);
  });

  window.ipcToMain.dataBrkPts(async (data: gdbBreakpoint[]) => {
    const newBreakpoints: breakpointMarker[] = [];

    data?.forEach((bp) => {
      if (bp.fullname === fullpath) {
        const bpLine = parseInt(bp.line, 10) - 1;
        const type = bp.enabled === "y" ? "ace_breakpoint_enabled" : "ace_breakpoint_disabled";
        newBreakpoints.push({ line: bpLine, type: type });
      }
    });
    setBreakpoints(newBreakpoints);
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
    setThreads(newThreads);
  });

  const onLoad = (editor: ace.Ace.Editor) => {
    editor.clearSelection();
  };

  useEffect(() => {
    // Add in Breakpoint Markers
    editorRef.current?.editor.getSession().clearBreakpoints();
    breakpoints.forEach((bp) => {
      editorRef.current?.editor.getSession().setBreakpoint(bp.line, bp.type);
    });

    //! Need a better way to represent thread markers in the gutter
    // Add in Thread Markers
    //   threads.forEach((th) => {
    //     if (th.path !== fullpath) {
    //       editorRef.current?.editor.getSession().addGutterCustomWidget(th.line, {
    //         className: "ace_thread_marker",
    //         label: "",
    //         title: th.title,
    //         callbacks: null,
    //       });
    //     }
    //   });
  }, [source, breakpoints, threads, fullpath]);

  // Delay the scrolling to the stack top until the source and stack top
  // are set and rendered, otherwise the scrollToLine function doesn't
  // have any effect
  useEffect(() => {
    editorRef.current?.editor.scrollToLine(currentMarker, true, true);
  }, [currentMarker]);

  editorRef.current?.editor.on("gutterclick", function (e: GdbAny) {
    const target = e.domEvent.target;

    if (
      target.className.indexOf("ace_gutter-cell") == -1 ||
      !editorRef.current?.editor.isFocused() ||
      e.clientX > 25 + target.getBoundingClientRect().left
    ) {
      return;
    }

    const row = e.getDocumentPosition().row;

    // If there's a breakpoint already defined, it should be removed, offering the toggle feature
    toggleBreakpointAtRow(e.editor, row);

    e.stop();
  });

  function toggleBreakpointAtRow(ed: ace.Ace.Editor, row: number) {
    if (ed.getSession().getBreakpoints()[row] === undefined) {
      window.ipcToMain.sendGdbCommand(`break ${fullFilePath}:${row + 1}`);
    } else {
      window.ipcToMain.sendGdbCommand(`clear ${fullFilePath}:${row + 1}`);
    }
  }

  function displayData(data: gdbShowSourceInfo) {
    if (data.contents) {
      setSource(data.contents);
    }
    if (data.fileName) {
      fullFilePath = data.fileName;
      setFullpath(data.fileName);
    }
    if (data.line) {
      setLine(data.line);
    }

    const baseName = data.fileName.replace(/^.*[\\/]/, "");
    setFilename(baseName);

    if (data.contents) {
      // Have source
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
      // No source
      if (srcViewRef.current && noSrcViewRef.current) {
        srcViewRef.current.hidden = true;
        noSrcViewRef.current.hidden = false;
      }
    }
  }

  return (
    <div className="full-size">
      <div className="full-size" ref={srcViewRef} hidden={false}>
        <div className="full-size flex-container">
          <div className="file-name flex-item-grow">{fullpath}</div>
          <AceEditor
            className="flex-item"
            ref={editorRef}
            mode="c_cpp" // Set language mode
            theme="tomorrow_night" // Set theme
            fontSize={14}
            lineHeight={15}
            onLoad={onLoad}
            value={source} // Bind the editor's value to state
            markers={stackMarkers}
            readOnly={true}
            showPrintMargin={false}
            showGutter={true}
            name="code-editor-instance" // Unique ID for the editor
            setOptions={{ fontFamily: "Consolas" }}
            style={{ width: "100%", height: "100%" }} // Apply styles
          />
        </div>
      </div>
      <div ref={noSrcViewRef}>
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

export default GdbSourceWindow;
