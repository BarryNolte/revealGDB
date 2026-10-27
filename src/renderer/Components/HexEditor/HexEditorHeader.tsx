import { JSX, MouseEvent } from "react";
import type { HexDataViewHeaderProps } from "./hex-editor-types";

export default function HexEditorHeader({
  header,
  mouseCallback,
}: HexDataViewHeaderProps): JSX.Element {
  return (
    <thead
      className="he-table-header"
      onMouseOver={(e: MouseEvent) => mouseCallback("Over", (e.target as Element).id)}
      onMouseLeave={(e: MouseEvent) => mouseCallback("Leave", (e.target as Element).id)}
    >
      {header}
    </thead>
  );
}
