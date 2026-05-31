/**
 * Implements settings dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `SettingsHandle`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import {
  forwardRef,
  JSX,
  RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { GdbAny } from "../../common/gdb-common";
import { editorThemes } from "../ToolWindows/GdbSourceWindow";
import "./Settings.css";

/** Props for settings dialog (currently unused) */
export interface SettingsProps {
  center?: boolean;
}

/** Available application themes */
const themes = ["Light", "Dark", "Auto"];

/** Available editor font sizes in points */
const fontSizes: string[] = ["8", "10", "11", "12", "14", "16", "18", "20"];

function settingsHeader(): JSX.Element {
  return <div className="dialogHeader">Settings</div>;
}

function settingsFooter(onClose: () => void): JSX.Element {
  return (
    <div>
      <ButtonComponent onClick={onClose}>OK</ButtonComponent>
    </div>
  );
}

function onSelectEditorTheme(e: GdbAny): void {
  window.dispatchEvent(
    new CustomEvent("changeEditor", { detail: { theme: e.itemData.value }, bubbles: false }),
  );
  window.ipcToMain.commands.app.notifyMain({
    command: "save-source-viewer-theme",
    data: e.itemData.value,
  });
}

function onSelectEditorFont(e: GdbAny): void {
  const newFontName = e.itemData.value;
  window.dispatchEvent(
    new CustomEvent("changeEditor", { detail: { fontName: newFontName }, bubbles: false }),
  );
  window.ipcToMain.commands.app.notifyMain({
    command: "save-source-viewer-font-name",
    data: newFontName,
  });
}

function onSelectEditorFontSize(e: GdbAny): void {
  const newFontSize = e.itemData.value;
  window.dispatchEvent(
    new CustomEvent("changeEditor", {
      detail: { fontSize: parseInt(newFontSize) },
      bubbles: false,
    }),
  );
  window.ipcToMain.commands.app.notifyMain({
    command: "save-source-viewer-font-size",
    data: newFontSize,
  });
}

function onChangeShowDebugInfo(e: GdbAny): void {
  window.dispatchEvent(
    new CustomEvent("changeApplication", { detail: { showDebugInfo: e.checked }, bubbles: false }),
  );
  window.ipcToMain.commands.app.notifyMain({
    command: "save-app-show-debug-info",
    data: e.checked,
  });
}

function onChangeDisableAutoSymbolLoading(e: GdbAny): void {
  window.ipcToMain.commands.app.notifyMain({
    command: "save-auto-symbol-loading",
    data: e.checked,
  });
}

function onSelectAppTheme(e: GdbAny): void {
  const newAppTheme = e.itemData.value;
  window.dispatchEvent(
    new CustomEvent("changeApplication", { detail: { theme: newAppTheme }, bubbles: false }),
  );
  window.ipcToMain.commands.app.notifyMain({ command: "save-app-theme", data: newAppTheme });
}

function SettingsTableHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}): JSX.Element {
  return (
    <table className="settingsFullWidth settingsTableHeader">
      <thead>
        <tr>
          <td className={className}>{title}</td>
        </tr>
        <tr>
          <td />
        </tr>
      </thead>
    </table>
  );
}

function SettingsApplicationSection({
  appThemeRef,
  appShowDebugInfoRef,
  appDisableAutoSymbolLoadingRef,
}: {
  appThemeRef: RefObject<DropDownListComponent | null>;
  appShowDebugInfoRef: RefObject<CheckBoxComponent | null>;
  appDisableAutoSymbolLoadingRef: RefObject<CheckBoxComponent | null>;
}): JSX.Element {
  return (
    <table className="settingsFullWidth settingsTable">
      <tbody>
        <tr>
          <td>Theme:</td>
          <td>
            <div data-testid="settings-app-theme">
              <DropDownListComponent
                id="settings-app-theme-input"
                ref={appThemeRef}
                className="settingsDropdown"
                select={onSelectAppTheme}
                dataSource={themes}
              />
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <div data-testid="settings-show-debug-info">
              <CheckBoxComponent
                id="settings-show-debug-info-input"
                ref={appShowDebugInfoRef}
                label="Show debug info in terminal"
                change={onChangeShowDebugInfo}
              />
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <div data-testid="settings-disable-auto-symbol-loading">
              <CheckBoxComponent
                id="settings-disable-auto-symbol-loading-input"
                ref={appDisableAutoSymbolLoadingRef}
                label="Turn off automatic symbol loading"
                change={onChangeDisableAutoSymbolLoading}
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function SettingsSourceViewSection({
  editorThemeRef,
  editorFontsRef,
  editorFontSizeRef,
  fontNames,
}: {
  editorThemeRef: RefObject<DropDownListComponent | null>;
  editorFontsRef: RefObject<DropDownListComponent | null>;
  editorFontSizeRef: RefObject<DropDownListComponent | null>;
  fontNames: GdbAny[];
}): JSX.Element {
  return (
    <table className="settingsFullWidth settingsTable">
      <tbody>
        <tr>
          <td>Theme:</td>
          <td>
            <div data-testid="settings-editor-theme">
              <DropDownListComponent
                id="settings-editor-theme-input"
                ref={editorThemeRef}
                className="settingsDropdown"
                select={onSelectEditorTheme}
                dataSource={editorThemes.keys().toArray()}
              />
            </div>
          </td>
        </tr>
        <tr>
          <td>Font:</td>
          <td>
            <div data-testid="settings-editor-font">
              <DropDownListComponent
                id="settings-editor-font-input"
                ref={editorFontsRef}
                className="settingsDropdown"
                dataSource={fontNames}
                select={onSelectEditorFont}
              />
            </div>
          </td>
        </tr>
        <tr>
          <td>Font Size:</td>
          <td>
            <div data-testid="settings-editor-font-size">
              <DropDownListComponent
                id="settings-editor-font-size-input"
                ref={editorFontSizeRef}
                className="settingsDropdown"
                dataSource={fontSizes}
                select={onSelectEditorFontSize}
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Imperative handle interface for parent components */
export type SettingsHandle = {
  /** Shows the settings dialog */
  ShowDialog: () => void;
};

/**
 * Settings dialog component with forward ref for imperative control.
 * Loads current settings on mount and provides UI for modifying preferences.
 */
const Settings = forwardRef<SettingsHandle, SettingsProps>((_props, ref): JSX.Element => {
  const [hideDialog, setHideDialog] = useState(false);
  const [fontNames, setFontNames] = useState<GdbAny[]>([]);

  const editorThemeRef = useRef<DropDownListComponent>(null);
  const editorFontSizeRef = useRef<DropDownListComponent>(null);
  const editorFontsRef = useRef<DropDownListComponent>(null);
  const appThemeRef = useRef<DropDownListComponent>(null);
  const appShowDebugInfoRef = useRef<CheckBoxComponent>(null);
  const appDisableAutoSymbolLoadingRef = useRef<CheckBoxComponent>(null);

  useImperativeHandle(ref, () => ({
    ShowDialog: () => {
      setHideDialog(true);
    },
  }));

  useEffect(() => {
    let isMounted = true;
    window.ipcToMain.queries.app.getSettings().then((gdb: GdbAny): void => {
      window.ipcToMain.queries.app.getSystemFonts().then((fontList: GdbAny[]) => {
        if (!isMounted) return;
        if (editorFontsRef.current) setFontNames(fontList);
        if (gdb.gui.sourceViewerFontName && editorFontsRef.current)
          editorFontsRef.current.value = gdb.gui.sourceViewerFontName;
      });
      if (gdb.gui.sourceViewerTheme && editorThemeRef.current)
        editorThemeRef.current.value = gdb.gui.sourceViewerTheme;
      if (gdb.gui.sourceViewerFontSize && editorFontSizeRef.current)
        editorFontSizeRef.current.value = gdb.gui.sourceViewerFontSize;
      if (gdb.gui.showDebugInfo && appShowDebugInfoRef.current)
        appShowDebugInfoRef.current.checked = gdb.gui.showDebugInfo;
      if (gdb.gui.applicationTheme && appThemeRef.current)
        appThemeRef.current.value = gdb.gui.applicationTheme;
      if (gdb.gui.disableAutoSymbolLoading && appDisableAutoSymbolLoadingRef.current)
        appDisableAutoSymbolLoadingRef.current.checked = gdb.gui.disableAutoSymbolLoading;
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="SettingsTarget" data-testid="settings-dialog-target">
      <DialogComponent
        className="dialogHeaderContainer"
        width="500px"
        target=".SettingsTarget"
        visible={hideDialog}
        header={settingsHeader}
        footerTemplate={() => settingsFooter(() => setHideDialog(false))}
        closeOnEscape={true}
        showCloseIcon={true}
        close={() => setHideDialog(false)}
        isModal={true}
      >
        <div className="settingsContainer">
          <SettingsTableHeader title="Application" className="settingsTag" />
          <SettingsApplicationSection
            appThemeRef={appThemeRef}
            appShowDebugInfoRef={appShowDebugInfoRef}
            appDisableAutoSymbolLoadingRef={appDisableAutoSymbolLoadingRef}
          />
          <SettingsTableHeader title="Source View" />
          <SettingsSourceViewSection
            editorThemeRef={editorThemeRef}
            editorFontsRef={editorFontsRef}
            editorFontSizeRef={editorFontSizeRef}
            fontNames={fontNames}
          />
        </div>
      </DialogComponent>
    </div>
  );
});

Settings.displayName = "Settings";
export { Settings };
export default Settings;
