import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { Component, JSX } from "react";
import "./AboutBox.css";
import packageInfo from "./../../../package.json";
import React from "react";
import { AppMainVersionInfo } from "../App";

interface AboutProps {
  center?: boolean;
}

interface AboutState {
  hideDialog: boolean;
  nodeVersion: string;
  electronVersion: string;
  architecture: string;
  v8Version: string;
  platform: string;
  osVersion: string;
}

export class AboutBox extends Component<AboutProps, AboutState> {
  constructor(props: AboutProps) {
    super(props);

    this.state = {
      hideDialog: false,
      nodeVersion: "",
      electronVersion: "",
      architecture: "",
      v8Version: "",
      platform: "",
      osVersion: "",
    };
  }

  // Function to open the dialog
  public ShowDialog() {
    this.setState({ nodeVersion: AppMainVersionInfo.get("Node Version") });
    this.setState({ electronVersion: AppMainVersionInfo.get("Electron Version") });
    this.setState({ architecture: AppMainVersionInfo.get("Architecture") });
    this.setState({ v8Version: AppMainVersionInfo.get("v8 Version") });
    this.setState({ platform: AppMainVersionInfo.get("Platform") });
    this.setState({ osVersion: AppMainVersionInfo.get("OS Version") });

    this.setState({ hideDialog: true });
  }

  // Function to close the dialog
  private dialogCloseFunc = () => {
    this.setState({ hideDialog: false });
  };

  private header = (): JSX.Element => {
    return <div className="dialogHeader">About</div>;
  };

  private footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={this.dialogCloseFunc}>OK</ButtonComponent>
      </div>
    );
  };

  override render(): JSX.Element {
    return (
      <div className="AboutBoxTarget">
        <DialogComponent
          className="dialogHeaderContainer"
          width="500px"
          target=".AboutBoxTarget"
          visible={this.state.hideDialog}
          header={this.header}
          footerTemplate={this.footer}
          closeOnEscape={true}
          showCloseIcon={true}
          close={this.dialogCloseFunc}
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
              <div className="aboutBoxDetails">Node Version: {this.state.nodeVersion}</div>
              <div className="aboutBoxDetails">Electron Version: {this.state.electronVersion}</div>
              <div className="aboutBoxDetails">v8 Version: {this.state.v8Version}</div>
              <div className="aboutBoxDetails">Architecture: {this.state.architecture}</div>
              <div className="aboutBoxDetails">Plateform: {this.state.platform}</div>
              <div className="aboutBoxDetails">OS Version: {this.state.osVersion}</div>
              <hr />
              <div className="aboutBoxGeneral">What a place to be...</div>
              <br />
              <div className="aboutBoxGeneral">Icons by Icons8</div>
            </div>
          </div>
        </DialogComponent>
      </div>
    );
  }
}
