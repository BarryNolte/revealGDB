/**
 * Implements view-offset.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HexOffsetView from "../../../../../src/renderer/Components/HexEditor/view-offset";

const noop = vi.fn();

describe("HexOffsetView", () => {
  it("renders the component container", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={noop} />,
    );
    expect(screen.getByTestId("hex-offset-view")).toBeTruthy();
  });

  it("renders the offset table", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={noop} />,
    );
    expect(screen.getByTestId("hex-offset-table")).toBeTruthy();
  });

  it("renders an OFFSET header cell", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={noop} />,
    );
    expect(screen.getByText("OFFSET")).toBeTruthy();
  });

  it("renders one offset row for 16 bytes (one row)", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={noop} />,
    );
    // One row: offset 0 → "00000000"
    expect(screen.getByText("00000000")).toBeTruthy();
  });

  it("renders two offset rows for 32 bytes", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(32)} mouseCallback={noop} />,
    );
    expect(screen.getByText("00000000")).toBeTruthy();
    expect(screen.getByText("00000010")).toBeTruthy();
  });

  it("adds provided offset to each row value", () => {
    render(
      <HexOffsetView offset={0x100} datasource={new Uint8Array(16)} mouseCallback={noop} />,
    );
    expect(screen.getByText("00000100")).toBeTruthy();
  });

  it("renders correct offset for second row with non-zero base offset", () => {
    render(
      <HexOffsetView offset={0x200} datasource={new Uint8Array(32)} mouseCallback={noop} />,
    );
    expect(screen.getByText("00000200")).toBeTruthy();
    expect(screen.getByText("00000210")).toBeTruthy();
  });

  it("renders no rows for empty datasource", () => {
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(0)} mouseCallback={noop} />,
    );
    // No offset value rows — just the header
    expect(screen.queryByText("00000000")).toBeNull();
    expect(screen.getByText("OFFSET")).toBeTruthy();
  });

  it("calls mouseCallback on MouseOver in the header", () => {
    const cb = vi.fn();
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={cb} />,
    );
    const thead = screen.getByTestId("hex-offset-table").querySelector("thead")!;
    fireEvent.mouseOver(thead);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback on MouseLeave in the header", () => {
    const cb = vi.fn();
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={cb} />,
    );
    const thead = screen.getByTestId("hex-offset-table").querySelector("thead")!;
    fireEvent.mouseLeave(thead);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });

  it("calls mouseCallback on MouseOver in the body", () => {
    const cb = vi.fn();
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={cb} />,
    );
    const tbody = screen.getByTestId("hex-offset-body");
    fireEvent.mouseOver(tbody);
    expect(cb).toHaveBeenCalledWith("Over", expect.any(String));
  });

  it("calls mouseCallback on MouseLeave in the body", () => {
    const cb = vi.fn();
    render(
      <HexOffsetView offset={0} datasource={new Uint8Array(16)} mouseCallback={cb} />,
    );
    const tbody = screen.getByTestId("hex-offset-body");
    fireEvent.mouseLeave(tbody);
    expect(cb).toHaveBeenCalledWith("Leave", expect.any(String));
  });
});
