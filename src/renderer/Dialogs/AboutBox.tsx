/**
 * About box dialog for RevealGDB.
 *
 * Displays application information including:
 * - Application name, version, and description
 * - Copyright and company information
 * - Runtime environment details (Node, Electron, V8, OS)
 *
 * Version information is fetched from the main process on dialog show.
 */

import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useImperativeHandle, useState } from "react";
import { AppMainVersionInfo } from "../App";
import packageInfo from "./../../../package.json";
import "./AboutBox.css";

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

  /** Closes the about dialog */
  const dialogCloseFunc = () => {
    setHideDialog(false);
  };

  /** Custom header component */
  const header = (): JSX.Element => {
    return <div className="dialogHeader">About</div>;
  };

  /** Custom footer with OK button */
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
            <div className="aboutBoxDetails">Node Version: {info.nodeVersion}</div>
            <div className="aboutBoxDetails">Electron Version: {info.electronVersion}</div>
            <div className="aboutBoxDetails">v8 Version: {info.v8Version}</div>
            <div className="aboutBoxDetails">Architecture: {info.architecture}</div>
            <div className="aboutBoxDetails">Plateform: {info.platform}</div>
            <div className="aboutBoxDetails">OS Version: {info.osVersion}</div>
            <hr />
            <div className="aboutBoxGeneral">What a place to be...</div>
            <br />
            <div className="aboutBoxGeneral">Icons by Icons8</div>
          </div>
        </div>
      </DialogComponent>
    </div>
  );
});

AboutBox.displayName = "AboutBox";
