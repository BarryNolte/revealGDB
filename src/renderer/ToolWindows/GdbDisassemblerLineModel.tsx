/**
 * Implements gdb disassembler line model behavior for debugger tool-window rendering and interactions.
 *
 * @remarks
 * Exported symbols include `toInstructionParts`, `extractFunctionName`, `renderInstructionParts`, `renderGroupCaption`. It coordinates live debugger data with user interactions in docked tool-window views.
 */
import { JSX } from "react";
import { DisasmToken } from "../../main/mi-interface/gdb-state-database/gdbStateDatabase";

type DisasmInstructionPart = {
  className: string;
  value: string;
  hasTrailingNbsp: boolean;
  functionAddress?: string;
};

type GroupCaptionProps = {
  field?: string;
  groupKey?: string;
  key?: string;
  count?: string;
};

/**
 * Performs to instruction part as part of this module's internal workflow.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param token - Value for `token` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
function toInstructionPart(token: DisasmToken): DisasmInstructionPart {
  switch (token.type) {
    case "instruction":
      return {
        className: "disasmInstruction",
        value: token.value,
        hasTrailingNbsp: false,
      };
    case "address":
      return {
        className: "disasmOpAddress",
        value: token.value,
        hasTrailingNbsp: true,
      };
    case "function":
      return {
        className: "disasmFunction",
        value: token.value,
        hasTrailingNbsp: true,
        functionAddress: token.value.trim().slice(1, -1),
      };
    case "leftparen":
    case "rightparen":
      return {
        className: "disasmParen",
        value: token.value,
        hasTrailingNbsp: true,
      };
    case "text":
    default:
      return {
        className: "disasmText",
        value: token.value,
        hasTrailingNbsp: true,
      };
  }
}

/**
 * Performs to instruction parts as part of this module's public API.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param tokens - Value for `tokens` consumed by this operation.
 * @returns The resulting collection produced by this operation.
 */
export function toInstructionParts(tokens: DisasmToken[]): DisasmInstructionPart[] {
  return tokens.map((token) => toInstructionPart(token));
}

/**
 * Extracts function name from the provided input.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param groupKey - Value for `groupKey` consumed by this operation.
 * @returns The resulting string value produced by this operation.
 */
export function extractFunctionName(groupKey?: string): string {
  return groupKey?.replace(/.*-/, "") || "Unknown Function";
}

/**
 * Renders instruction parts for display.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param tokens - Value for `tokens` consumed by this operation.
 * @param onFunctionClick - Callback invoked when the associated event occurs.
 * @returns The computed result produced by this operation.
 */
export function renderInstructionParts(
  tokens: DisasmToken[],
  onFunctionClick: (functionAddress: string) => void,
): JSX.Element {
  const parts = toInstructionParts(tokens).map((part, index) => {
    if (part.functionAddress) {
      return (
        <span
          key={`${part.className}-${index}`}
          className={part.className}
          onClick={() => onFunctionClick(part.functionAddress!)}
        >
          {part.value}
          {part.hasTrailingNbsp ? "\u00A0" : ""}
        </span>
      );
    }

    return (
      <span key={`${part.className}-${index}`} className={part.className}>
        {part.value}
        {part.hasTrailingNbsp ? "\u00A0" : ""}
      </span>
    );
  });

  return <div>{parts}</div>;
}

/**
 * Renders group caption for display.
 *
 * @remarks
 * Supports debugger tool-window rendering, interaction handling, or data synchronization.
 *
 * @param props - Value for `props` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function renderGroupCaption(props: GroupCaptionProps): JSX.Element {
  const functionName = extractFunctionName(props.groupKey);

  return (
    <div className="e-groupcaption disasm-function-group-header">
      <strong>{functionName}&nbsp;:&nbsp;</strong>
      <span>({props.count} lines)</span>
    </div>
  );
}
