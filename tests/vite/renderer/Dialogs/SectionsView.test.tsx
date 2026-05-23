// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SectionsView,
  type SectionsViewHandle,
} from "../../../../src/renderer/Dialogs/SectionsView";

const mockShowDialog = vi.fn();
const mockHideDialog = vi.fn();
const mockOnOptionsChange = vi.fn();

vi.mock("../../../../src/renderer/Dialogs/useSectionsViewController", () => ({
  useSectionsViewController: () => ({
    visible: false,
    symbolFiles: null,
    options: { showEmptySpace: false, showLegend: false },
    showDialog: mockShowDialog,
    hideDialog: mockHideDialog,
    onOptionsChange: mockOnOptionsChange,
  }),
}));

vi.mock("../../../../src/renderer/Dialogs/SectionsViewView", () => ({
  SectionsViewView: ({ visible, hideDialog }: { visible: boolean; hideDialog: () => void }) => (
    <div data-testid="sections-view-view" data-visible={String(visible)}>
      <button type="button" onClick={hideDialog}>
        hide
      </button>
    </div>
  ),
}));

describe("SectionsView", () => {
  it("renders the view sub-component", () => {
    const ref = createRef<SectionsViewHandle>();
    const { getByTestId } = render(<SectionsView ref={ref} />);
    expect(getByTestId("sections-view-view")).toBeTruthy();
  });

  it("calling ShowDialog on the ref delegates to the controller showDialog", () => {
    const ref = createRef<SectionsViewHandle>();
    render(<SectionsView ref={ref} />);

    act(() => {
      ref.current?.ShowDialog();
    });

    expect(mockShowDialog).toHaveBeenCalledTimes(1);
  });
});
