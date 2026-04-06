// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GdbSourceWindowView from "../../../../src/renderer/ToolWindows/GdbSourceWindowView";

vi.mock("@syncfusion/ej2-react-navigations", () => ({
  ContextMenuComponent: () => <div data-testid="context-menu" />,
}));

vi.mock("react-ace", () => ({
  default: () => <div data-testid="ace-editor" />,
}));

describe("GdbSourceWindowView", () => {
  const baseProps = {
    menuId: "test",
    hasSource: true,
    editorRef: { current: null },
    fullpath: "/tmp/main.c",
    filename: "main.c",
    line: "10",
    source: "int main(){}",
    mode: "c_cpp",
    theme: "gruvbox",
    fontSize: 14,
    lineHeight: 15,
    fontName: "monospace",
    stackMarkers: [],
    onLoad: vi.fn(),
    onCopySelection: vi.fn(),
  };

  it("shows source editor path when source is available", () => {
    render(<GdbSourceWindowView {...baseProps} hasSource={true} />);

    expect(screen.getByTestId("source-pane").hidden).toBe(false);
    expect(screen.getByTestId("no-source-pane").hidden).toBe(true);
    expect(screen.getAllByText("/tmp/main.c").length).toBeGreaterThan(0);
  });

  it("shows no-source fallback when source is unavailable", () => {
    render(<GdbSourceWindowView {...baseProps} hasSource={false} source="" />);

    expect(screen.getByTestId("source-pane").hidden).toBe(true);
    expect(screen.getByTestId("no-source-pane").hidden).toBe(false);
    expect(screen.getByText("No Source Found:")).toBeTruthy();
    expect(screen.getByText("main.c")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });
});
