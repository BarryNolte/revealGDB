import { ButtonComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { forwardRef, JSX, useImperativeHandle, useState } from "react";

interface ConnectionManagerProps {
  center?: boolean;
}

export type ConnectionManagerHandle = {
  ShowDialog: () => void;
};

export const ConnectionManager = forwardRef<ConnectionManagerHandle, ConnectionManagerProps>(
  (_props, ref): JSX.Element => {
    const [hideDialog, setHideDialog] = useState(false);

    useImperativeHandle(ref, () => ({
      ShowDialog: () => {
        setHideDialog(true);
      },
    }));

    const dialogCloseFunc = () => {
      setHideDialog(false);
    };

    const header = (): JSX.Element => {
      return <div className="dialogHeader">Connections</div>;
    };

    const footer = (): JSX.Element => {
      return (
        <div>
          <ButtonComponent onClick={dialogCloseFunc}>OK</ButtonComponent>
        </div>
      );
    };

    return (
      <div className="ConnectionManagerTarget">
        <DialogComponent
          className="dialogHeaderContainer"
          width="500px"
          target=".ConnectionManagerTarget"
          visible={hideDialog}
          header={header}
          footerTemplate={footer}
          closeOnEscape={true}
          showCloseIcon={true}
          close={dialogCloseFunc}
          isModal={true} // Makes the dialog modal
        >
          Hello World!
        </DialogComponent>
      </div>
    );
  },
);

ConnectionManager.displayName = "ConnectionManager";
