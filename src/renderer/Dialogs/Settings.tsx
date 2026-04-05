/**
 * Settings dialog for RevealGDB.
 *
 * Allows users to configure:
 * - Source editor theme and fonts (Monaco editor settings)
 * - Application theme (Light/Dark)
 * - Debug information display options
 *
 * Settings are persisted to the main process and applied immediately
 * via custom events that update relevant components.
 */

import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useEffect, useImperativeHandle, useRef, useState } from "react";

import { GdbAny } from "../../common/gdb-common";
import { editorThemes } from "../ToolWindows/GdbSourceWindow";
import "./Settings.css";

/** Props for settings dialog (currently unused) */
interface SettingsProps {
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

  /** Closes the settings dialog */
  const dialogCloseFunc = () => {
    setHideDialog(false);
  };

  /** Custom header component */
  const header = (): JSX.Element => {
    return <div className="dialogHeader">Settings</div>;
  };

  /** Custom footer with OK button */
  const footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={dialogCloseFunc}>OK</ButtonComponent>
      </div>
    );
  };

  /**
   * Handles editor theme selection change.
   * Updates the source window editor theme and persists to settings.
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
   * Handles editor font selection change.
   * Updates the source window editor font and persists to settings.
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
   * Handles editor font size selection change.
   * Updates the source window editor font size and persists to settings.
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
   * Handles debug info display toggle.
   * Shows/hides debug information in various UI components.
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
   * Handles application theme selection change.
   * Switches between Light and Dark themes for the entire application.
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
