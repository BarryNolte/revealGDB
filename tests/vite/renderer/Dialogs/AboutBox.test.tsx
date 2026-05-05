// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { AboutBox, type AboutBoxHandle } from "../../../../src/renderer/Dialogs/AboutBox";

vi.mock("../../../../src/renderer/utilities/app-version-state", () => ({
  AppMainVersionInfo: new Map([
    ["Node Version", "22.0.0"],
    ["Electron Version", "35.0.0"],
    ["Architecture", "x64"],
    ["v8 Version", "12.4"],
    ["Platform", "win32"],
    ["OS Version", "11"],
  ]),
}));

vi.mock("@syncfusion/ej2-react-buttons", () => ({
  ButtonComponent: ({
    onClick,
    children,
  }: {
    onClick?: () => void;
    children?: React.ReactNode;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@syncfusion/ej2-react-popups", () => ({
  DialogComponent: ({
    visible,
    header,
    footerTemplate,
    close,
    children,
  }: {
    visible?: boolean;
    header?: React.ReactNode | (() => React.ReactNode);
    footerTemplate?: React.ReactNode | (() => React.ReactNode);
    close?: () => void;
    children?: React.ReactNode;
  }) => {
    if (!visible) {
      return null;
    }

    return (
      <div role="dialog">
        <div>{typeof header === "function" ? header() : header}</div>
        <div>{children}</div>
        <div>{typeof footerTemplate === "function" ? footerTemplate() : footerTemplate}</div>
        <button type="button" onClick={close}>
          close-dialog
        </button>
      </div>
    );
  },
}));

describe("AboutBox", () => {
  it("shows version info from AppMainVersionInfo and closes from the footer button", () => {
    const ref = createRef<AboutBoxHandle>();

    render(<AboutBox ref={ref} />);

    act(() => {
      ref.current?.ShowDialog();
    });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.getByText(/Version \S+/)).toBeTruthy();
    expect(screen.getByText("Node Version:")).toBeTruthy();
    expect(screen.getByText("22.0.0")).toBeTruthy();
    expect(screen.getByText("Electron Version:")).toBeTruthy();
    expect(screen.getByText("35.0.0")).toBeTruthy();
    expect(screen.getByText("Architecture:")).toBeTruthy();
    expect(screen.getByText("x64")).toBeTruthy();
    expect(screen.getByText("Platform:")).toBeTruthy();
    expect(screen.getByText("win32")).toBeTruthy();
    expect(screen.getByText("OS Version:")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
