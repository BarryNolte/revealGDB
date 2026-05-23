// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import DragAndDropList from "../../../../../src/renderer/Components/DragAndDropList/DragAndDropList";
function createDataTransfer(): DataTransfer {
  const data: Record<string, string> = {};
  return {
    dataTransfer: undefined,
    dropEffect: "move",
    effectAllowed: "move",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    setData: (type: string, value: string) => {
      data[type] = value;
    },
    getData: (type: string) => data[type] ?? "",
    clearData: (type?: string) => {
      if (type) {
        delete data[type];
      } else {
        Object.keys(data).forEach((key) => delete data[key]);
      }
    },
    setDragImage: () => undefined,
  } as DataTransfer;
}

function getOptionLabels(): string[] {
  const listItems = document.querySelectorAll(".drag-drop-list-item");
  return Array.from(listItems).map((node) => {
    const label = node.querySelector(".drag-drop-list-item-label");
    return label?.textContent ?? "";
  });
}

function getListItems(): HTMLElement[] {
  const listItems = document.querySelectorAll(".drag-drop-list-item");
  return Array.from(listItems) as HTMLElement[];
}

test("reorders items on drag enter", () => {
  render(<DragAndDropList items={["Alpha", "Beta", "Gamma"]} ariaLabel="Test list" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Start dragging the first item
  fireEvent.dragStart(options[0], { dataTransfer });

  // Drag over the third item - should reorder immediately
  fireEvent.dragEnter(options[2], { dataTransfer });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Beta", "Gamma", "Alpha"]);
});

test("calls onReorder on drag end", () => {
  const onReorder = vi.fn();
  render(
    <DragAndDropList items={["One", "Two", "Three"]} onReorder={onReorder} ariaLabel="Test" />,
  );

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Start dragging the third item
  fireEvent.dragStart(options[2], { dataTransfer });

  // Drag to the first position
  fireEvent.dragEnter(options[0], { dataTransfer });

  // End the drag - get updated options after reorder
  const updatedOptions = getListItems();
  fireEvent.dragEnd(updatedOptions[0], { dataTransfer });

  expect(onReorder).toHaveBeenCalledTimes(1);
  expect(onReorder).toHaveBeenCalledWith(["Three", "One", "Two"]);
});

test("applies id to the list", () => {
  render(<DragAndDropList id="drag-list" items={["One", "Two"]} ariaLabel="Test list" />);

  const list = document.querySelector(".drag-drop-list");
  expect(list?.getAttribute("id")).toBe("drag-list");
});

test("reorders multiple times during drag", () => {
  render(<DragAndDropList items={["Red", "Green", "Blue"]} ariaLabel="Color list" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Start dragging the first item
  fireEvent.dragStart(options[0], { dataTransfer });

  // Drag over second position
  fireEvent.dragEnter(options[1], { dataTransfer });
  let reordered = getOptionLabels();
  expect(reordered).toEqual(["Green", "Red", "Blue"]);

  // Continue dragging to third position
  const optionsAfterFirst = getListItems();
  fireEvent.dragEnter(optionsAfterFirst[2], { dataTransfer });
  reordered = getOptionLabels();
  expect(reordered).toEqual(["Green", "Blue", "Red"]);
});

test("reorders object items in place", () => {
  const items = [
    { text: "First", id: "obj-1" },
    { text: "Second", id: "obj-2" },
    { text: "Third", id: "obj-3" },
  ];
  const onReorder = vi.fn();
  render(<DragAndDropList items={items} onReorder={onReorder} ariaLabel="Object list" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Drag third item to first position
  fireEvent.dragStart(options[2], { dataTransfer });
  fireEvent.dragEnter(options[0], { dataTransfer });
  fireEvent.dragEnd(options[2], { dataTransfer });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Third", "First", "Second"]);

  // Verify onReorder was called with correct object items
  expect(onReorder).toHaveBeenCalledWith([
    { text: "Third", id: "obj-3" },
    { text: "First", id: "obj-1" },
    { text: "Second", id: "obj-2" },
  ]);
});

test("dragging to same position keeps order unchanged", () => {
  const onReorder = vi.fn();
  render(
    <DragAndDropList items={["Alpha", "Beta", "Gamma"]} onReorder={onReorder} ariaLabel="Test" />,
  );

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Drag first item and drop it on itself
  fireEvent.dragStart(options[0], { dataTransfer });
  fireEvent.dragEnter(options[0], { dataTransfer });
  fireEvent.dragEnd(options[0], { dataTransfer });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Alpha", "Beta", "Gamma"]);

  // onReorder should still be called with unchanged order
  expect(onReorder).toHaveBeenCalledWith(["Alpha", "Beta", "Gamma"]);
});

test("applies dragging class during drag operation", () => {
  render(<DragAndDropList items={["One", "Two", "Three"]} ariaLabel="Test" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Initially no dragging class
  expect(options[0].className).not.toContain("is-dragging");

  // Start dragging first item
  fireEvent.dragStart(options[0], { dataTransfer });

  // Should have dragging class
  const updatedOptions = getListItems();
  expect(updatedOptions[0].className).toContain("is-dragging");

  // End dragging
  fireEvent.dragEnd(updatedOptions[0], { dataTransfer });

  // Dragging class should be removed
  const finalOptions = getListItems();
  expect(finalOptions[0].className).not.toContain("is-dragging");
});

test("does not call onReorder if not provided", () => {
  // Should not throw when onReorder is not provided
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  expect(() => {
    fireEvent.dragStart(options[0], { dataTransfer });
    fireEvent.dragEnter(options[1], { dataTransfer });
    fireEvent.dragEnd(options[0], { dataTransfer });
  }).not.toThrow();
});

test("reorders from last to first position", () => {
  render(<DragAndDropList items={["A", "B", "C", "D"]} ariaLabel="Test" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Drag last item to first position
  fireEvent.dragStart(options[3], { dataTransfer });
  fireEvent.dragEnter(options[0], { dataTransfer });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["D", "A", "B", "C"]);
});

test("reorders from first to last position", () => {
  render(<DragAndDropList items={["A", "B", "C", "D"]} ariaLabel="Test" />);

  const options = getListItems();
  const dataTransfer = createDataTransfer();

  // Drag first item to last position
  fireEvent.dragStart(options[0], { dataTransfer });
  const updatedOptions = getListItems();
  fireEvent.dragEnter(updatedOptions[3], { dataTransfer });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["B", "C", "D", "A"]);
});

test("adds item to top of list on button click", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["Alpha", "Beta"]} onReorder={onReorder} ariaLabel="Test list" />);

  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  const button = screen.getByRole("button", { name: "Add item to list" });

  fireEvent.change(input, { target: { value: "Gamma" } });
  fireEvent.click(button);

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Gamma", "Alpha", "Beta"]);
  expect(input.value).toBe("");
  expect(onReorder).toHaveBeenCalledWith(["Gamma", "Alpha", "Beta"]);
});

test("adds item to top of list on enter key", () => {
  const onReorder = vi.fn();
  render(
    <DragAndDropList items={["First", "Second"]} onReorder={onReorder} ariaLabel="Test list" />,
  );

  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Third" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Third", "First", "Second"]);
  expect(onReorder).toHaveBeenCalledWith(["Third", "First", "Second"]);
});

test("deletes item on delete button click", () => {
  const onReorder = vi.fn();
  render(
    <DragAndDropList items={["Alpha", "Beta", "Gamma"]} onReorder={onReorder} ariaLabel="Test" />,
  );

  const deleteButton = screen.getByRole("button", { name: "Delete Beta" });
  fireEvent.click(deleteButton);

  const reordered = getOptionLabels();
  expect(reordered).toEqual(["Alpha", "Gamma"]);
  expect(onReorder).toHaveBeenCalledWith(["Alpha", "Gamma"]);
});

test("adds item then drags it - new item persists", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["Alpha", "Beta"]} onReorder={onReorder} ariaLabel="Test list" />);

  // Add a new item to the top
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Gamma" } });
  fireEvent.click(screen.getByRole("button", { name: "Add item to list" }));

  // Verify added item is at top
  let labels = getOptionLabels();
  expect(labels).toEqual(["Gamma", "Alpha", "Beta"]);

  // Now drag the newly added item to the last position
  const items = getListItems();
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(items[0], { dataTransfer });
  fireEvent.dragEnter(items[2], { dataTransfer });
  fireEvent.dragEnd(items[0], { dataTransfer });

  // Verify the new item persists and is now at the end
  labels = getOptionLabels();
  expect(labels).toEqual(["Alpha", "Beta", "Gamma"]);
});

test("deletes item then drags another - deleted item stays gone", () => {
  const onReorder = vi.fn();
  render(
    <DragAndDropList
      items={["Alpha", "Beta", "Gamma", "Delta"]}
      onReorder={onReorder}
      ariaLabel="Test"
    />,
  );

  // Delete Beta
  const deleteButton = screen.getByRole("button", { name: "Delete Beta" });
  fireEvent.click(deleteButton);

  // Verify Beta is gone
  let labels = getOptionLabels();
  expect(labels).toEqual(["Alpha", "Gamma", "Delta"]);

  // Now drag Delta to the first position
  const items = getListItems();
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(items[2], { dataTransfer }); // Delta is now at index 2
  fireEvent.dragEnter(items[0], { dataTransfer });
  fireEvent.dragEnd(items[2], { dataTransfer });

  // Verify Beta is still gone and order changed
  labels = getOptionLabels();
  expect(labels).toEqual(["Delta", "Alpha", "Gamma"]);
  expect(labels).not.toContain("Beta");
});

test("adds item, deletes another, then drags - changes persist", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["One", "Two"]} onReorder={onReorder} ariaLabel="Test list" />);

  // Add "Three" to top
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Three" } });
  fireEvent.click(screen.getByRole("button", { name: "Add item to list" }));

  // Delete "Two"
  const deleteButton = screen.getByRole("button", { name: "Delete Two" });
  fireEvent.click(deleteButton);

  // Should now have ["Three", "One"]
  let labels = getOptionLabels();
  expect(labels).toEqual(["Three", "One"]);

  // Drag "One" to the top
  const items = getListItems();
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(items[1], { dataTransfer });
  fireEvent.dragEnter(items[0], { dataTransfer });
  fireEvent.dragEnd(items[1], { dataTransfer });

  // Should now be ["One", "Three"] with "Two" still deleted
  labels = getOptionLabels();
  expect(labels).toEqual(["One", "Three"]);
  expect(labels).not.toContain("Two");
});

test("drag state is cleared when deleting item", () => {
  render(<DragAndDropList items={["Alpha", "Beta", "Gamma"]} ariaLabel="Test" />);

  const items = getListItems();
  const dataTransfer = createDataTransfer();

  // Start dragging first item
  fireEvent.dragStart(items[0], { dataTransfer });

  // Verify item has dragging class
  let updatedItems = getListItems();
  expect(updatedItems[0].className).toContain("is-dragging");

  // Delete an item (should clear drag state)
  const deleteButton = screen.getByRole("button", { name: "Delete Beta" });
  fireEvent.click(deleteButton);

  // Verify no items have dragging class anymore
  updatedItems = getListItems();
  updatedItems.forEach((item) => {
    expect(item.className).not.toContain("is-dragging");
  });
});

test("drag state is cleared when adding item", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test list" />);

  const items = getListItems();
  const dataTransfer = createDataTransfer();

  // Start dragging first item
  fireEvent.dragStart(items[0], { dataTransfer });

  // Verify item has dragging class
  let updatedItems = getListItems();
  expect(updatedItems[0].className).toContain("is-dragging");

  // Add a new item (should clear drag state)
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Three" } });
  fireEvent.click(screen.getByRole("button", { name: "Add item to list" }));

  // Verify no items have dragging class anymore
  updatedItems = getListItems();
  updatedItems.forEach((item) => {
    expect(item.className).not.toContain("is-dragging");
  });
});

test("newly added item can be dragged and properly exits drag mode", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test list" />);

  // Add a new item
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "Three" } });
  fireEvent.click(screen.getByRole("button", { name: "Add item to list" }));

  // Verify item was added at top
  let labels = getOptionLabels();
  expect(labels).toEqual(["Three", "One", "Two"]);

  // Now drag the newly added item
  const items = getListItems();
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(items[0], { dataTransfer }); // Drag "Three"

  // Verify item has dragging class during drag
  let updatedItems = getListItems();
  expect(updatedItems[0].className).toContain("is-dragging");

  // Complete the drag operation
  fireEvent.dragEnter(items[2], { dataTransfer }); // Move to end

  // Get the items again after dragEnter reordered them
  updatedItems = getListItems();
  fireEvent.dragEnd(updatedItems[2], { dataTransfer }); // Now it's at position 2

  // Verify item no longer has dragging class after drag ends
  const finalItems = getListItems();
  finalItems.forEach((item) => {
    expect(item.className).not.toContain("is-dragging");
  });

  // Verify the item was actually moved
  labels = getOptionLabels();
  expect(labels).toEqual(["One", "Two", "Three"]);
});

test("applies custom className to container", () => {
  render(<DragAndDropList items={["A", "B"]} ariaLabel="Test" className="my-custom-class" />);
  const container = document.querySelector(".drag-drop-list-container");
  expect(container?.className).toBe("drag-drop-list-container my-custom-class");
});

test("dragover event with dataTransfer sets dropEffect to move", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test" />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  const dataTransfer = createDataTransfer();
  // Override dropEffect so we can verify it was actually set by the handler
  dataTransfer.dropEffect = "none" as DataTransfer["dropEffect"];
  expect(() => fireEvent.dragOver(list, { dataTransfer })).not.toThrow();
  expect(dataTransfer.dropEffect).toBe("move");
});

test("dragover event without dataTransfer does not throw", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test" />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  expect(() => fireEvent.dragOver(list)).not.toThrow();
});

test("drop event after drag calls onReorder with current item order", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["A", "B", "C"]} onReorder={onReorder} ariaLabel="Test" />);
  const options = getListItems();
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(options[2], { dataTransfer });
  fireEvent.dragEnter(options[0], { dataTransfer });
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  fireEvent.drop(list, { dataTransfer });
  expect(onReorder).toHaveBeenCalledWith(["C", "A", "B"]);
});

test("drop event without onReorder does not throw", () => {
  render(<DragAndDropList items={["A", "B"]} ariaLabel="Test" />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(getListItems()[0], { dataTransfer });
  expect(() => fireEvent.drop(list, { dataTransfer })).not.toThrow();
});

test("does not add item when input is empty", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["Alpha", "Beta"]} onReorder={onReorder} ariaLabel="Test" />);
  fireEvent.click(screen.getByRole("button", { name: "Add item to list" }));
  expect(getOptionLabels()).toEqual(["Alpha", "Beta"]);
  expect(onReorder).not.toHaveBeenCalled();
});

test("does not add item when input is whitespace only", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["Alpha"]} onReorder={onReorder} ariaLabel="Test" />);
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(getOptionLabels()).toEqual(["Alpha"]);
  expect(onReorder).not.toHaveBeenCalled();
});

test("clicking item label does not delete the item", () => {
  render(<DragAndDropList items={["Alpha", "Beta"]} ariaLabel="Test" />);
  const label = document.querySelector(".drag-drop-list-item-label") as HTMLElement;
  fireEvent.click(label);
  expect(getOptionLabels()).toEqual(["Alpha", "Beta"]);
});

test("uses default ariaLabel when ariaLabel prop is omitted", () => {
  render(<DragAndDropList items={["A", "B"]} />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  expect(list.getAttribute("aria-label")).toBe("Reorder list");
});

test("dragstart on list element (not li) returns early without error", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test" />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  const dataTransfer = createDataTransfer();
  // Fire dragstart directly on the ul, not on an li — triggers the !li early return
  expect(() => fireEvent.dragStart(list, { dataTransfer })).not.toThrow();
  // No drag should have started — no item should have is-dragging class
  getListItems().forEach((item) => {
    expect(item.className).not.toContain("is-dragging");
  });
});

test("dragstart without dataTransfer returns early without error", () => {
  render(<DragAndDropList items={["One", "Two"]} ariaLabel="Test" />);
  const items = getListItems();
  // Fire dragstart without a dataTransfer — triggers the !transfer early return
  expect(() => fireEvent.dragStart(items[0])).not.toThrow();
});

test("dragenter on list element (not li) returns early without error", () => {
  render(<DragAndDropList items={["One", "Two", "Three"]} ariaLabel="Test" />);
  const list = document.querySelector(".drag-drop-list") as HTMLElement;
  const dataTransfer = createDataTransfer();
  fireEvent.dragStart(getListItems()[0], { dataTransfer });
  // Fire dragenter on the ul itself, not an li — triggers !li early return in dragEnter
  expect(() => fireEvent.dragEnter(list, { dataTransfer })).not.toThrow();
  // Order should be unchanged
  expect(getOptionLabels()).toEqual(["One", "Two", "Three"]);
});

test("dragenter with no active drag (null draggedIndex) returns early", () => {
  render(<DragAndDropList items={["One", "Two", "Three"]} ariaLabel="Test" />);
  const items = getListItems();
  const dataTransfer = createDataTransfer();
  // Fire dragenter without first firing dragstart — draggedIndexRef is null
  expect(() => fireEvent.dragEnter(items[1], { dataTransfer })).not.toThrow();
  // Order should be unchanged
  expect(getOptionLabels()).toEqual(["One", "Two", "Three"]);
});

test("mounts without error when ResizeObserver is defined", () => {
  const mockObserver = { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  const MockResizeObserver = vi.fn(() => mockObserver);
  Object.defineProperty(globalThis, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: MockResizeObserver,
  });
  try {
    render(<DragAndDropList items={["A", "B"]} ariaLabel="Test" />);
    expect(getListItems().length).toBe(2);
  } finally {
    Object.defineProperty(globalThis, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: undefined,
    });
  }
});

test("keydown on input with non-Enter key does not add item", () => {
  const onReorder = vi.fn();
  render(<DragAndDropList items={["Alpha"]} onReorder={onReorder} ariaLabel="Test" />);
  const input = screen.getByLabelText("Add item") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "NewItem" } });
  fireEvent.keyDown(input, { key: "Tab" });
  expect(getOptionLabels()).toEqual(["Alpha"]);
  expect(onReorder).not.toHaveBeenCalled();
});


/**
 * @file DragAndDropList.test.tsx
 * @description Source module for DragAndDropList.test.
 */


/**
 * DragAndDropList.test module.
 *
 * @remarks
 * Source module for DragAndDropList.test.
 */
