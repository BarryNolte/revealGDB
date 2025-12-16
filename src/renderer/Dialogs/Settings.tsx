import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { Component, JSX } from "react";

interface SettingsProps {
  center?: boolean;
}

interface SettingsState {
  hideDialog: boolean;
}

export class Settings extends Component<SettingsProps, SettingsState> {
  constructor(props: SettingsProps) {
    super(props);
    this.state = { hideDialog: false };
  }

  ShowDialog() {
    this.setState({ hideDialog: true });
  }

  private dialogCloseFunc = () => {
    this.setState({ hideDialog: false });
  };

  private header = (): JSX.Element => {
    return <div className="aboutBoxHeader">Settings</div>;
  };

  private footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent className="aboutBoxButton" onClick={this.dialogCloseFunc}>
          OK
        </ButtonComponent>
      </div>
    );
  };

  override render() {
    return (
      <div className="SettingsTarget">
        <DialogComponent
          className="aboutBoxHeaderContainer"
          width="500px"
          target=".SettingsTarget"
          visible={this.state.hideDialog}
          header={this.header}
          footerTemplate={this.footer}
          closeOnEscape={true}
          showCloseIcon={true}
          close={this.dialogCloseFunc}
          isModal={true} // Makes the dialog modal
        >
          Hello World!
        </DialogComponent>
      </div>
    );
  }
}
