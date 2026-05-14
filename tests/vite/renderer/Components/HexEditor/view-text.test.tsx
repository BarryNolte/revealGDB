// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HexTextView from "../../../../../src/renderer/Components/HexEditor/view-text";

const noop = vi.fn();

describe("HexTextView", () => {
  it("renders the component container", () => {
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-text-view")).toBeTruthy();
  });

  it("renders the text table", () => {
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-text-table")).toBeTruthy();
  });

  it("renders 16 column headers (0–F)", () => {
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("renders printable ASCII characters directly", () => {
    // 'A' = 65, 'Z' = 90
    const data = new Uint8Array([65, 90]);
    render(<HexTextView datasource={data} mouseCallback={noop} />);
    // 'A' may also appear as column header, use getAllByText
    const aElems = screen.getAllByText("A");
    expect(aElems.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Z").length).toBeGreaterThanOrEqual(1);
  });

  it("renders '.' for non-printable bytes in ASCII mode", () => {
    // 0x00 and 0x01 are non-printable
    const data = new Uint8Array([0x00, 0x01]);
    render(<HexTextView datasource={data} mouseCallback={noop} />);
    // Both should display as '.'
    const dots = screen.getAllByText(".");
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });

  it("renders a partial last row without crashing", () => {
    const data = new Uint8Array(17);
    data[16] = 65; // 'A'
    render(<HexTextView datasource={data} mouseCallback={noop} />);
    const aChars = screen.getAllByText("A");
    expect(aChars.length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty datasource without crashing", () => {
    render(<HexTextView datasource={new Uint8Array(0)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-text-view")).toBeTruthy();
  });

  it("calls mouseCallback with 'Over' on mouse-over in the header", () => {
    const cb = vi.fn();
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const thead = screen.getByTestId("hex-text-table").querySelector("thead")!;
    fireEvent.mouseOver(thead);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback with 'Leave' on mouse-leave in the header", () => {
    const cb = vi.fn();
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const thead = screen.getByTestId("hex-text-table").querySelector("thead")!;
    fireEvent.mouseLeave(thead);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });

  it("calls mouseCallback with 'Over' on mouse-over in the body", () => {
    const cb = vi.fn();
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-text-body");
    fireEvent.mouseOver(tbody);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback with 'Leave' on mouse-leave in the body", () => {
    const cb = vi.fn();
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-text-body");
    fireEvent.mouseLeave(tbody);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });

  it("calls mouseCallback with 'Click' on click in the body", () => {
    const cb = vi.fn();
    render(<HexTextView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-text-body");
    fireEvent.click(tbody);
    expect(cb).toHaveBeenCalledWith("Click", expect.any(String));
  });
});
