import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DropDownListComponent } from "@syncfusion/ej2-react-dropdowns";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { Component, createRef, JSX } from "react";

import "./Settings.css";
import { editorThemes } from "../ToolWindows/GdbSourceWindow";
import { GdbAny } from "../../common/gdb-common";

interface SettingsProps {
  center?: boolean;
}

interface SettingsState {
  hideDialog: boolean;
  fontNames: GdbAny[];
}

const themes = ["Light", "Dark"];

export class Settings extends Component<SettingsProps, SettingsState> {
  editorThemeRef = createRef<DropDownListComponent>();
  editorFontSizeRef = createRef<DropDownListComponent>();
  editorFontsRef = createRef<DropDownListComponent>();
  appThemeRef = createRef<DropDownListComponent>();
  appShowDebugInfoRef = createRef<CheckBoxComponent>();

  constructor(props: SettingsProps) {
    super(props);
    this.state = { hideDialog: false, fontNames: [] };
  }

  override componentDidMount(): void {
    window.ipcToMain.getSettings().then((gdb: GdbAny): void => {
      window.ipcToMain.getSystemFonts().then((fontList: GdbAny[]) => {
        if (this.editorFontsRef.current) {
          this.setState({ fontNames: fontList });
        }
        if (gdb.gui.sourceViewerFontName && this.editorFontsRef.current) {
          this.editorFontsRef.current.value = gdb.gui.sourceViewerFontName;
        }
      });

      if (gdb.gui.sourceViewerTheme && this.editorThemeRef.current) {
        this.editorThemeRef.current.value = gdb.gui.sourceViewerTheme;
      }

      if (gdb.gui.sourceViewerFontSize && this.editorFontSizeRef.current) {
        this.editorFontSizeRef.current.value = gdb.gui.sourceViewerFontSize;
      }

      if (gdb.gui.showDebugInfo && this.appShowDebugInfoRef.current) {
        this.appShowDebugInfoRef.current.checked = gdb.gui.showDebugInfo;
      }

      if (gdb.gui.applicationTheme && this.appThemeRef.current) {
        this.appThemeRef.current.value = gdb.gui.applicationTheme;
      }
    });
  }

  public ShowDialog() {
    this.setState({ hideDialog: true });
  }

  private dialogCloseFunc = () => {
    this.setState({ hideDialog: false });
  };

  private header = (): JSX.Element => {
    return <div className="dialogHeader">Settings</div>;
  };

  private footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={this.dialogCloseFunc}>OK</ButtonComponent>
      </div>
    );
  };
  private onSelectEditorTheme = (e: GdbAny) => {
    window.dispatchEvent(
      new CustomEvent("changeEditor", { detail: { theme: e.itemData.value }, bubbles: false }),
    );

    window.ipcToMain.notifyMain({
      command: "save-source-viewer-theme",
      data: e.itemData.value,
    });
  };

  private onSelectEditorFont = (e: GdbAny) => {
    const newFontName = e.itemData.value;
    window.dispatchEvent(
      new CustomEvent("changeEditor", {
        detail: { fontName: newFontName },
        bubbles: false,
      }),
    );

    window.ipcToMain.notifyMain({
      command: "save-source-viewer-font-name",
      data: newFontName,
    });
  };

  private onSelectEditorFontSize = (e: GdbAny) => {
    const newFontSize = e.itemData.value;
    window.dispatchEvent(
      new CustomEvent("changeEditor", {
        detail: { fontSize: parseInt(newFontSize) },
        bubbles: false,
      }),
    );

    window.ipcToMain.notifyMain({
      command: "save-source-viewer-font-size",
      data: newFontSize,
    });
  };

  private onChangeShowDebugInfo = (e: GdbAny) => {
    window.dispatchEvent(
      new CustomEvent("changeApplication", {
        detail: { showDebugInfo: e.checked },
        bubbles: false,
      }),
    );

    window.ipcToMain.notifyMain({
      command: "save-app-show-debug-info",
      data: e.checked,
    });
  };

  private onSelectAppTheme = (e: GdbAny) => {
    const newAppTheme = e.itemData.value;
    window.dispatchEvent(
      new CustomEvent("changeApplication", {
        detail: { theme: newAppTheme },
        bubbles: false,
      }),
    );

    window.ipcToMain.notifyMain({
      command: "save-app-theme",
      data: newAppTheme,
    });
  };

  private fontSizes: string[] = ["8", "10", "11", "12", "14", "16", "18", "20"];
  override render() {
    return (
      <div className="SettingsTarget">
        <DialogComponent
          className="dialogHeaderContainer"
          width="500px"
          target=".SettingsTarget"
          visible={this.state.hideDialog}
          header={this.header}
          footerTemplate={this.footer}
          closeOnEscape={true}
          showCloseIcon={true}
          close={this.dialogCloseFunc}
          isModal={true}
        >
          <div className="settingsContainer">
            <table className="settingsFullWidth settingsTableHeader">
              <tr>
                <td className="settingsTag">Application</td>
              </tr>
              <tr>
                <hr />
              </tr>
            </table>
            <table className="settingsFullWidth settingsTable">
              <tr>
                <td>Theme:</td>
                <td>
                  <DropDownListComponent
                    ref={this.appThemeRef}
                    className="settingsDropdown"
                    select={this.onSelectAppTheme}
                    dataSource={themes}
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <CheckBoxComponent
                    ref={this.appShowDebugInfoRef}
                    label="Show debug info in terminal"
                    change={this.onChangeShowDebugInfo}
                  />
                </td>
              </tr>
            </table>
            <table className="settingsFullWidth settingsTableHeader">
              <tr>
                <td>Source View</td>
              </tr>
              <tr>
                <hr />
              </tr>
            </table>
            <table className="settingsFullWidth settingsTable">
              <tr>
                <td>Theme:</td>
                <td>
                  <DropDownListComponent
                    ref={this.editorThemeRef}
                    className="settingsDropdown"
                    select={this.onSelectEditorTheme}
                    dataSource={editorThemes.keys().toArray()}
                  />
                </td>
              </tr>
              <tr>
                <td>Font:</td>
                <td>
                  <DropDownListComponent
                    ref={this.editorFontsRef}
                    className="settingsDropdown"
                    dataSource={this.state.fontNames}
                    select={this.onSelectEditorFont}
                  />
                </td>
              </tr>
              <tr>
                <td>Font Size:</td>
                <td>
                  <DropDownListComponent
                    ref={this.editorFontSizeRef}
                    className="settingsDropdown"
                    dataSource={this.fontSizes}
                    select={this.onSelectEditorFontSize}
                  />
                </td>
              </tr>
            </table>
          </div>
        </DialogComponent>
      </div>
    );
  }
}
