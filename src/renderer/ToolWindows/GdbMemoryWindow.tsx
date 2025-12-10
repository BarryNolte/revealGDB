import RevealHexEditor from "../../../components/reveal-hex-editor/reveal-hex-editor";
import React, { useState } from "react";

function GdbMemoryWindow() {
  const [datasource] = useState<Uint8Array>(window.crypto.getRandomValues(new Uint8Array(257)));

  return <RevealHexEditor datasource={datasource} />;
}

export default GdbMemoryWindow;
