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

export function toInstructionParts(tokens: DisasmToken[]): DisasmInstructionPart[] {
  return tokens.map((token) => toInstructionPart(token));
}

export function extractFunctionName(groupKey?: string): string {
  return groupKey?.replace(/.*-/, "") || "Unknown Function";
}

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

export function renderGroupCaption(props: GroupCaptionProps): JSX.Element {
  const functionName = extractFunctionName(props.groupKey);

  return (
    <div className="e-groupcaption disasm-function-group-header">
      <strong>{functionName}:\u00A0\u00A0\u00A0\u00A0</strong>
      <span>({props.count} lines)</span>
    </div>
  );
}
