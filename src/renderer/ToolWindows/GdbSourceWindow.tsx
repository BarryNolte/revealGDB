import * as React from "react";
import { useRef, useState } from "react";
import AceEditor from "react-ace";
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

ace.config.setModuleUrl("../../node_modules", "ace-builds"); // Set base path for ace

const defaultValue = `function onLoad(editor) {
  console.log("i've loaded");
}`;

function GdbSourceWindow() {
  const [source, setSource] = useState(defaultValue);

  const editorRef = useRef<AceEditor>(null);

  const onLoad = (editor: ace.Ace.Editor) => {
    editor.clearSelection();
    editor.getSession().addEventListener("changeBreakpoint", onChangeBreakpoint);
    editor.getSession().setBreakpoint(1, "ace_breakpoint");
  };

  const onChange = (newValue: string) => {
    setSource(newValue);
    editorRef.current?.editor.session.setBreakpoint(1, "breakpoint1");
    console.log("Editor content changed: \n", source);
  };

  const onChangeBreakpoint = () => {
    console.log("Breakpoint changed");
  };

  return (
    <AceEditor
      ref={editorRef}
      mode="c_cpp" // Set language mode
      theme="tomorrow_night" // Set theme
      fontSize={14}
      onChange={onChange}
      onLoad={onLoad}
      readOnly={true}
      showPrintMargin={false}
      showGutter={true}
      highlightActiveLine={true}
      navigateToFileEnd={false}
      value={source} // Bind the editor's value to state
      name="code-editor-instance" // Unique ID for the editor
      editorProps={{
        $blockScrolling: true,
      }} // Recommended prop
      setOptions={{}}
      style={{ width: "100%", height: "100%" }} // Apply styles
    />
  );
}

export default GdbSourceWindow;
