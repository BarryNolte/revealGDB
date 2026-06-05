/**
 * Implements editor-entry-form.test for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DataViewEnum,
  TextViewEnum,
} from "../../../../../src/renderer/Components/HexEditor/common";
import EditorEntry from "../../../../../src/renderer/Components/HexEditor/editor-entry-form";

describe("EditorEntry", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <EditorEntry datalength={256} dataCallback={vi.fn()} textCallback={vi.fn()} />,
    );
    expect(container.querySelector("select[title='radix']")).toBeTruthy();
    expect(container.querySelector("select[title='textView']")).toBeTruthy();
  });

  it("calls dataCallback with Byte1 (0) when radix select changes to value '0' (parseInt falsy fallback)", () => {
    const dataCallback = vi.fn();
    const { container } = render(
      <EditorEntry datalength={256} dataCallback={dataCallback} textCallback={vi.fn()} />,
    );
    const radixSelect = container.querySelector<HTMLSelectElement>("select[title='radix']")!;
    fireEvent.change(radixSelect, { target: { value: "0" } });
    // parseInt("0") = 0 (falsy) → fallback to DataViewEnum.Byte1 = 0
    expect(dataCallback).toHaveBeenCalledWith(DataViewEnum.Byte1);
  });

  it("calls dataCallback with Byte2 (1) when radix select changes to a truthy value", () => {
    const dataCallback = vi.fn();
    const { container } = render(
      <EditorEntry datalength={256} dataCallback={dataCallback} textCallback={vi.fn()} />,
    );
    const radixSelect = container.querySelector<HTMLSelectElement>("select[title='radix']")!;
    fireEvent.change(radixSelect, { target: { value: "1" } });
    expect(dataCallback).toHaveBeenCalledWith(DataViewEnum.Byte2);
  });

  it("calls textCallback with ascii (1) when text select changes to a truthy value", () => {
    const textCallback = vi.fn();
    const { container } = render(
      <EditorEntry datalength={256} dataCallback={vi.fn()} textCallback={textCallback} />,
    );
    const textSelect = container.querySelector<HTMLSelectElement>("select[title='textView']")!;
    fireEvent.change(textSelect, { target: { value: "1" } });
    expect(textCallback).toHaveBeenCalledWith(TextViewEnum.ascii);
  });

  it("falls back to TextViewEnum.ascii when text select value is '0' (none, parseInt falsy)", () => {
    const textCallback = vi.fn();
    const { container } = render(
      <EditorEntry datalength={256} dataCallback={vi.fn()} textCallback={textCallback} />,
    );
    const textSelect = container.querySelector<HTMLSelectElement>("select[title='textView']")!;
    fireEvent.change(textSelect, { target: { value: "0" } });
    // parseInt("0") = 0 (falsy) → fallback to TextViewEnum.ascii = 1
    expect(textCallback).toHaveBeenCalledWith(TextViewEnum.ascii);
  });
});
