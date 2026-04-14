/**
 * Implements about box dialog state and interaction workflows in the renderer.
 *
 * @remarks
 * Exported symbols include `AboutBoxHandle`, `AboutBox`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useImperativeHandle, useState } from "react";
import { AppMainVersionInfo } from "../App";
import packageInfo from "./../../../package.json";
import "./AboutBox.css";

import iconBMC from "../icons/bmc_qr.png";

/** Props for about dialog (currently unused) */
interface AboutProps {
  center?: boolean;
}

/** State interface for runtime version information */
interface AboutInfoState {
  nodeVersion: string;
  electronVersion: string;
  architecture: string;
  v8Version: string;
  platform: string;
  osVersion: string;
}

/** Imperative handle interface for parent components */
export type AboutBoxHandle = {
  /** Shows the about dialog */
  ShowDialog: () => void;
};

/**
 * About box component with forward ref for imperative control.
 * Uses modal dialog with version information fetched on display.
 */
export const AboutBox = forwardRef<AboutBoxHandle, AboutProps>((_props, ref): JSX.Element => {
  const [hideDialog, setHideDialog] = useState(false);
  const [info, setInfo] = useState<AboutInfoState>({
    nodeVersion: "",
    electronVersion: "",
    architecture: "",
    v8Version: "",
    platform: "",
    osVersion: "",
  });

  // Expose ShowDialog method to parent components
  useImperativeHandle(ref, () => ({
    /**
     * Shows the dialog and populates version information.
     * Fetches runtime details from the main process.
     */
    ShowDialog: () => {
      /**
       * Returns info value from current state.
       *
       * @param key - Value for `key` consumed by this operation.
       * @returns The resulting string value produced by this operation.
       */
      const getInfoValue = (key: string): string => {
        return (AppMainVersionInfo?.get(key) ?? "") as string;
      };

      setInfo({
        nodeVersion: getInfoValue("Node Version"),
        electronVersion: getInfoValue("Electron Version"),
        architecture: getInfoValue("Architecture"),
        v8Version: getInfoValue("v8 Version"),
        platform: getInfoValue("Platform"),
        osVersion: getInfoValue("OS Version"),
      });
      setHideDialog(true);
    },
  }));

  /**
   * Performs dialog close func as part of this module's internal workflow.
   */
  const dialogCloseFunc = () => {
    setHideDialog(false);
  };

  const openIcons8Link = () => {
    window.ipcToMain.commands.app.notifyMain({
      command: "open-external",
      data: "https://icons8.com/",
    });
  };

  const openBMCLink = () => {
    window.ipcToMain.commands.app.notifyMain({
      command: "open-external",
      data: "https://buymeacoffee.com/barrynolte",
    });
  };

  /**
   * Performs header as part of this module's internal workflow.
   *
   * @returns The computed result produced by this operation.
   */
  const header = (): JSX.Element => {
    return <div className="dialogHeader">About</div>;
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

  return (
    <div className="AboutBoxTarget">
      <DialogComponent
        className="dialogHeaderContainer"
        width="500px"
        target=".AboutBoxTarget"
        visible={hideDialog}
        header={header}
        footerTemplate={footer}
        closeOnEscape={true}
        showCloseIcon={true}
        close={dialogCloseFunc}
        isModal={true} // Makes the dialog modal
      >
        <div className="aboutBoxContent">
          <div className="aboutBox-background-div"></div>
          <div className="aboutBoxText">
            <div className="aboutBoxTitle">revealGDB</div>
            <hr />
            <div className="aboutBoxImportant">Version {packageInfo.version}</div>
            <div className="aboutBoxImportant">
              Copyright {packageInfo.copyright} - {packageInfo.company}
            </div>
            <div className="aboutBoxImportant">{packageInfo.description}</div>
            <hr />
            <table>
              <tr>
                <td>
                  <div className="aboutBoxDetails">Node Version:</div>
                </td>
                <td>
                  <div>{info.nodeVersion}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="aboutBoxDetails">Electron Version:</div>
                </td>
                <td>
                  <div>{info.electronVersion}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="aboutBoxDetails">v8 Version:</div>
                </td>
                <td>
                  <div>{info.v8Version}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="aboutBoxDetails">Architecture:</div>
                </td>
                <td>
                  <div>{info.architecture}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="aboutBoxDetails">Platform:</div>
                </td>
                <td>
                  <div>{info.platform}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <div className="aboutBoxDetails">OS Version:</div>
                </td>
                <td>
                  <div>{info.osVersion}</div>
                </td>
              </tr>
            </table>
            <hr />
            <div className="aboutBoxGeneral">
              Icons by{" "}
              <button className="aboutBoxLink" type="button" onClick={openIcons8Link}>
                Icons8
              </button>
            </div>
            <div className="aboutBoxGeneral">
              <button className="aboutBox-buymeacoffee-button" type="button" onClick={openBMCLink}>
                <img
                  className="aboutBox-buymeacoffee-img"
                  src={iconBMC}
                  alt="Buy Me a Coffee"
                ></img>{" "}
              </button>
              <div>Buy me a Coffee</div>
            </div>
          </div>
        </div>
      </DialogComponent>
    </div>
  );
});

AboutBox.displayName = "AboutBox";
