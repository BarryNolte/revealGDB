// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import GdbSourceWindow from "./GdbSourceWindow";

vi.mock("./GdbSourceWindowView", () => ({
  default: () => {
    throw new Error("source view exploded");
  },
}));

vi.mock("./useGdbSourceWindowController", () => ({
  useGdbSourceWindowController: () => ({
    sourceState: {
      source: "int main(){}",
      fullpath: "/tmp/main.c",
      filename: "main.c",
      line: "1",
      hasSource: true,
      currentMarker: 0,
      stackMarkers: [],
    },
    mode: "c_cpp",
    theme: "chrome",
    fontSize: 12,
    lineHeight: 16,
    fontName: "monospace",
    editorRef: { current: null },
    onLoad: vi.fn(),
    onCopySelection: vi.fn(),
  }),
}));

describe("GdbSourceWindow error boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows ToolWindowErrorBoundary fallback when child render throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<GdbSourceWindow />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Source encountered an error.")).toBeTruthy();
    expect(screen.getByText("source view exploded")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
