import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { Component, JSX } from "react";
import "./AboutBox.css";
import packageInfo from "./../../../package.json";

// import { GdbAny } from "../../common/gdb-common";

interface AboutProps {
  center?: boolean;
}

interface AboutState {
  hideDialog: boolean;
  version: string;
}

export class AboutBox extends Component<AboutProps, AboutState> {
  constructor(props: AboutProps) {
    super(props);

    this.state = { hideDialog: false, version: "" };
  }

  override componentDidMount() {}

  // Function to open the dialog
  public ShowDialog() {
    this.setState({ hideDialog: true });
  }

  private tweak = () => {
    this.setState({ version: "Hello" });
  };

  // Function to close the dialog
  private dialogCloseFunc = () => {
    this.setState({ hideDialog: false });
  };

  private header = (): JSX.Element => {
    return <div className="aboutBoxHeader">revealGDB - A better way to debug, probably...</div>;
  };

  private footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent className="aboutBoxButton" onClick={this.tweak}>
          Tweak
        </ButtonComponent>
        <ButtonComponent className="aboutBoxButton" onClick={this.dialogCloseFunc}>
          OK
        </ButtonComponent>
      </div>
    );
  };

  private content = (): JSX.Element => {
    return (
      <div className="aboutBoxContent">
        <div className="aboutBox-background-div"></div>
        <div className="aboutBoxText">
          <div className="aboutBoxTitle">revealGDB</div>
          <div className="aboutBoxImportant">Version {packageInfo.version}</div>
          <div className="aboutBoxImportant">Copyright {packageInfo.copyright}</div>
          <div className="aboutBoxImportant">{packageInfo.description}</div>
          <div className="aboutBoxImportant">Node Version: {this.state.version}</div>
          <br />
          <div className="aboutBoxGeneral">Hello</div>
        </div>
      </div>
    );
  };

  override render() {
    return (
      <div className="App" id="dialog-target">
        <DialogComponent
          className="aboutBoxHeaderContainer"
          width="500px"
          content={this.content}
          target=".App"
          visible={this.state.hideDialog}
          header={this.header}
          footerTemplate={this.footer}
          closeOnEscape={true}
          showCloseIcon={true}
          close={this.dialogCloseFunc}
          isModal={true} // Makes the dialog modal
        />
      </div>
    );
  }
}
