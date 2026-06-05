/**
 * Implements the dangerous command confirmation dialog in the renderer.
 *
 * @remarks
 * Exported symbols include `DangerousCommandDialog`. Shown when the main process
 * intercepts a command on the dangerous commands list that has no saved default answer.
 */
import { ButtonComponent, CheckBoxComponent } from "@syncfusion/ej2-react-buttons";
import { DialogComponent } from "@syncfusion/ej2-react-popups";
import { JSX, useRef } from "react";
import type { DangerousCommandResponse } from "../../common/ipc-contracts";

type Props = {
  commandText: string;
  reason?: string;
  onResponse: (response: DangerousCommandResponse) => void;
};
/**
 * Performs DangerousCommandDialog as part of this module's internal workflow.
 *
 * @param { commandText - { commandText parameter.
 * @param reason - reason parameter.
 * @param onResponse } - onResponse } parameter.
 * @returns The computed result produced by this operation.
 */

export function DangerousCommandDialog({ commandText, reason, onResponse }: Props): JSX.Element {
  const rememberRef = useRef(false);
  /**
   * Performs respond as part of this module's internal workflow.
   *
   * @param allow - allow parameter.
   * @returns The computed result produced by this operation.
   */

  const respond = (allow: boolean) => {
    onResponse({ allow, remember: rememberRef.current, answer: allow ? "yes" : "no" });
  };

  return (
    <DialogComponent
      width="420px"
      target="body"
      visible={true}
      isModal={true}
      closeOnEscape={false}
      showCloseIcon={false}
      header={() => <div className="dialogHeader">Dangerous Command</div>}
      footerTemplate={() => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <ButtonComponent isPrimary={true} onClick={() => respond(true)}>
            Yes
          </ButtonComponent>
          <ButtonComponent onClick={() => respond(false)}>No</ButtonComponent>
        </div>
      )}
    >
      <div style={{ padding: "8px 0" }}>
        <p style={{ margin: "0 0 12px" }}>
          The command <code>{commandText}</code> may be dangerous. Proceed?
        </p>
        {reason && <p style={{ margin: "0 0 12px", fontStyle: "italic" }}>Reason: {reason}</p>}
        <CheckBoxComponent
          label="Remember this answer"
          change={(e) => {
            rememberRef.current = e.checked ?? false;
          }}
        />
      </div>
    </DialogComponent>
  );
}
