import { Component, JSX } from "react";
import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";

interface ConnectionManagerProps {
  center?: boolean;
}

interface ConnectionManagerState {
  hideDialog: boolean;
}

export class ConnectionManager extends Component<ConnectionManagerProps, ConnectionManagerState> {
  constructor(props: ConnectionManagerProps) {
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
    return <div className="dialogHeader">Connections</div>;
  };

  private footer = (): JSX.Element => {
    return (
      <div>
        <ButtonComponent onClick={this.dialogCloseFunc}>OK</ButtonComponent>
      </div>
    );
  };

  override render() {
    return (
      <div className="ConnectionManagerTarget">
        <DialogComponent
          className="dialogHeaderContainer"
          width="500px"
          target=".ConnectionManagerTarget"
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
