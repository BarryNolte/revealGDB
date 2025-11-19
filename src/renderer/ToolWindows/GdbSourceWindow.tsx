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

ace.config.setModuleUrl("../../node_modules", "ace-builds"); // Set base path for ace

function GdbSourceWindow() {
  const [source, setSource] = useState<string>("");
  const [fullpath, setFullpath] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [line, setLine] = useState<string>("");
  const [stackMarkers, setStackMarkers] = useState<IMarker[]>([]);
  const [currentMarker, setCurrentMarker] = useState<number>(-1);

  const editorRef = useRef<AceEditor>(null);
  const srcViewRef = useRef<HTMLDivElement>(null);
  const noSrcViewRef = useRef<HTMLDivElement>(null);

  window.ipcToMain.sourceFile((data: gdbShowSourceInfo) => {
    displayData(data);
  });

  const onLoad = (editor: ace.Ace.Editor) => {
    editor.clearSelection();
    editor.getSession().addEventListener("changeBreakpoint", onChangeBreakpoint);
    //editor.getSession().setBreakpoint(1, "ace_breakpoint");
  };

  // Delay the scrolling to the stack top until the source and stack top
  // are set and rendered, otherwise the scrollToLine function doesn't
  // have any effect
  useEffect(() => {
    editorRef.current?.editor.scrollToLine(currentMarker, true, true);
  }, [source, currentMarker]);

  function displayData(data: gdbShowSourceInfo) {
    if (data.contents) {
      setSource(data.contents);
    }
    if (data.fileName) {
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

  const onChangeBreakpoint = () => {
    console.log("Breakpoint changed");
  };

  return (
    <div className="full-size">
      <div className="full-size" ref={srcViewRef} hidden={false}>
        <div className="file-name">{fullpath}</div>
        <AceEditor
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
