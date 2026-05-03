/**
 * Implements settings dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `SettingsHandle`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useEffect, useImperativeHandle, useRef, useState } from "react";

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

  // Refs for form controls
  const editorThemeRef = useRef<DropDownListComponent>(null);
  const editorFontSizeRef = useRef<DropDownListComponent>(null);
  const editorFontsRef = useRef<DropDownListComponent>(null);
  const appThemeRef = useRef<DropDownListComponent>(null);
  const appShowDebugInfoRef = useRef<CheckBoxComponent>(null);

  // Expose ShowDialog method to parent components
  useImperativeHandle(ref, () => ({
    ShowDialog: () => {
      setHideDialog(true);
    },
  }));

  /**
   * Load current settings on component mount.
   * Fetches settings and system fonts from main process and populates form controls.
   */
  useEffect(() => {
    let isMounted = true;

    window.ipcToMain.queries.app.getSettings().then((gdb: GdbAny): void => {
      window.ipcToMain.queries.app.getSystemFonts().then((fontList: GdbAny[]) => {
        if (!isMounted) return;
        if (editorFontsRef.current) {
          setFontNames(fontList);
        }
        if (gdb.gui.sourceViewerFontName && editorFontsRef.current) {
          editorFontsRef.current.value = gdb.gui.sourceViewerFontName;
        }
      });

      if (gdb.gui.sourceViewerTheme && editorThemeRef.current) {
        editorThemeRef.current.value = gdb.gui.sourceViewerTheme;
      }
      if (gdb.gui.sourceViewerFontSize && editorFontSizeRef.current) {
        editorFontSizeRef.current.value = gdb.gui.sourceViewerFontSize;
      }
      if (gdb.gui.showDebugInfo && appShowDebugInfoRef.current) {
        appShowDebugInfoRef.current.checked = gdb.gui.showDebugInfo;
      }
      if (gdb.gui.applicationTheme && appThemeRef.current) {
        appThemeRef.current.value = gdb.gui.applicationTheme;
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Performs dialog close func as part of this module's internal workflow.
   */
  const dialogCloseFunc = () => {
    setHideDialog(false);
  };

  /**
   * Performs header as part of this module's internal workflow.
   *
   * @returns The computed result produced by this operation.
   */
  const header = (): JSX.Element => {
    return <div className="dialogHeader">Settings</div>;
  };

  /**
   * Performs footer as part of this module's internal workflow.
   *
   * @returns The computed result produced by this operation.
   */
  const footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={dialogCloseFunc}>OK</ButtonComponent>
      </div>
    );
  };

  /**
   * Performs on select editor theme as part of this module's internal workflow.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  const onSelectEditorTheme = (e: GdbAny) => {
    window.dispatchEvent(
      new CustomEvent("changeEditor", { detail: { theme: e.itemData.value }, bubbles: false }),
    );

    window.ipcToMain.commands.app.notifyMain({
      command: "save-source-viewer-theme",
      data: e.itemData.value,
    });
  };

  /**
   * Performs on select editor font as part of this module's internal workflow.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  const onSelectEditorFont = (e: GdbAny) => {
    const newFontName = e.itemData.value;
    window.dispatchEvent(
      new CustomEvent("changeEditor", {
        detail: { fontName: newFontName },
        bubbles: false,
      }),
    );

    window.ipcToMain.commands.app.notifyMain({
      command: "save-source-viewer-font-name",
      data: newFontName,
    });
  };

  /**
   * Performs on select editor font size as part of this module's internal workflow.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  const onSelectEditorFontSize = (e: GdbAny) => {
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
  };

  /**
   * Performs on change show debug info as part of this module's internal workflow.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  const onChangeShowDebugInfo = (e: GdbAny) => {
    window.dispatchEvent(
      new CustomEvent("changeApplication", {
        detail: { showDebugInfo: e.checked },
        bubbles: false,
      }),
    );

    window.ipcToMain.commands.app.notifyMain({
      command: "save-app-show-debug-info",
      data: e.checked,
    });
  };

  /**
   * Performs on select app theme as part of this module's internal workflow.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  const onSelectAppTheme = (e: GdbAny) => {
    const newAppTheme = e.itemData.value;
    window.dispatchEvent(
      new CustomEvent("changeApplication", {
        detail: { theme: newAppTheme },
        bubbles: false,
      }),
    );

    window.ipcToMain.commands.app.notifyMain({
      command: "save-app-theme",
      data: newAppTheme,
    });
  };

  return (
    <div className="SettingsTarget" data-testid="settings-dialog-target">
      <DialogComponent
        className="dialogHeaderContainer"
        width="500px"
        target=".SettingsTarget"
        visible={hideDialog}
        header={header}
        footerTemplate={footer}
        closeOnEscape={true}
        showCloseIcon={true}
        close={dialogCloseFunc}
        isModal={true}
      >
        <div className="settingsContainer">
          <table className="settingsFullWidth settingsTableHeader">
            <thead>
              <tr>
                <td className="settingsTag">Application</td>
              </tr>
              <tr>
                <td />
              </tr>
            </thead>
          </table>
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
            </tbody>
          </table>
          <table className="settingsFullWidth settingsTableHeader">
            <thead>
              <tr>
                <td>Source View</td>
              </tr>
              <tr>
                <td />
              </tr>
            </thead>
          </table>
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
        </div>
      </DialogComponent>
    </div>
  );
});

Settings.displayName = "Settings";
export { Settings };
export default Settings;
