/**
 * Implements view-data.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HexDataView from "../../../../../src/renderer/Components/HexEditor/view-data";

const noop = vi.fn();

describe("HexDataView", () => {
  it("renders the component container", () => {
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-data-view")).toBeTruthy();
  });

  it("renders the data table", () => {
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-data-table")).toBeTruthy();
  });

  it("renders the data body", () => {
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-data-body")).toBeTruthy();
  });

  it("renders 16 column headers (0–F)", () => {
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={noop} />);
    // Headers: 0..9 and A..F
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("F")).toBeTruthy();
  });

  it("renders byte values as 2-digit uppercase hex", () => {
    const data = new Uint8Array([0x00, 0x0f, 0xa5, 0xff]);
    render(<HexDataView datasource={data} mouseCallback={noop} />);
    expect(screen.getByText("00")).toBeTruthy();
    expect(screen.getByText("0F")).toBeTruthy();
    expect(screen.getByText("A5")).toBeTruthy();
    expect(screen.getByText("FF")).toBeTruthy();
  });

  it("renders a partial last row correctly", () => {
    // 17 bytes → 1 full row + 1 byte in second row
    const data = new Uint8Array(17);
    data[16] = 0xab;
    render(<HexDataView datasource={data} mouseCallback={noop} />);
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("renders empty datasource without crashing", () => {
    render(<HexDataView datasource={new Uint8Array(0)} mouseCallback={noop} />);
    expect(screen.getByTestId("hex-data-view")).toBeTruthy();
  });

  it("calls mouseCallback with 'Over' on mouse-over in the header", () => {
    const cb = vi.fn();
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const thead = screen.getByTestId("hex-data-table").querySelector("thead")!;
    fireEvent.mouseOver(thead);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback with 'Leave' on mouse-leave in the header", () => {
    const cb = vi.fn();
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const thead = screen.getByTestId("hex-data-table").querySelector("thead")!;
    fireEvent.mouseLeave(thead);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });

  it("calls mouseCallback with 'Over' on mouse-over in the body", () => {
    const cb = vi.fn();
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-data-body");
    fireEvent.mouseOver(tbody);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback with 'Leave' on mouse-leave in the body", () => {
    const cb = vi.fn();
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-data-body");
    fireEvent.mouseLeave(tbody);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });

  it("calls mouseCallback with 'Click' on click in the body", () => {
    const cb = vi.fn();
    render(<HexDataView datasource={new Uint8Array(16)} mouseCallback={cb} />);
    const tbody = screen.getByTestId("hex-data-body");
    fireEvent.click(tbody);
    expect(cb).toHaveBeenCalledWith("Click", expect.any(String));
  });
});
