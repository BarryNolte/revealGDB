/**
 * Drag-and-drop reorderable list component.
 *
 * Provides a simple list editor with:
 * - Drag-and-drop reordering
 * - Item deletion
 * - Item insertion from a text input
 * - Keyboard support for adding items (Enter)
 *
 * This component keeps an internal working copy during interaction so drag
 * updates remain responsive, while still supporting controlled updates from
 * parent props via `items` and `onReorder`.
 */

import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./DragAndDropList.css";

//console.log("[DragAndDropList] Module loaded");

export type DragAndDropListItem = string | { id: string; text: string };

export type DragAndDropListProps = {
  id?: string;
  items: DragAndDropListItem[];
  onReorder?: (items: DragAndDropListItem[]) => void;
  ariaLabel?: string;
  className?: string;
};

/**
 * Returns a new array where one item has been moved from `fromIndex` to
 * `toIndex`.
 */
function moveItem(
  items: DragAndDropListItem[],
  fromIndex: number,
  toIndex: number,
): DragAndDropListItem[] {
  if (fromIndex === toIndex) {
    return items.slice();
  }

  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function DragAndDropList({
  id,
  items,
  onReorder,
  ariaLabel = "Reorder list",
  className,
}: DragAndDropListProps): JSX.Element {
  // Keep a local copy while interacting so drag updates are immediate.
  const [internalItems, setInternalItems] = useState<DragAndDropListItem[] | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const internalItemsRef = useRef<DragAndDropListItem[]>(items);

  // Keep refs in sync
  useEffect(() => {
    draggedIndexRef.current = draggedIndex;
  }, [draggedIndex]);

  useEffect(() => {
    internalItemsRef.current = internalItems ?? items;
  }, [internalItems, items]);

  // If parent provides new items, refresh internal reference.
  useEffect(() => {
    internalItemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement || typeof ResizeObserver === "undefined") {
      return;
    }
  }, []);

  const handleDeleteItem = useCallback(
    (index: number) => {
      // Remove by index from the current working list and publish change.
      const nextItems = internalItemsRef.current.filter((_, itemIndex) => itemIndex !== index);
      internalItemsRef.current = nextItems;
      setInternalItems(nextItems);
      setDraggedIndex(null);
      onReorder?.(nextItems);
    },
    [onReorder],
  );

  // Use native listeners because some host dialog/event boundaries can swallow
  // React synthetic drag events in this UI.
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const handleNativeDragStart = (e: Event) => {
      const dragEvent = e as globalThis.DragEvent;
      const target = dragEvent.target as HTMLElement;
      const li = target.closest("li");
      if (!li || !listElement.contains(li)) return;

      const index = Array.from(listElement.children).indexOf(li);
      //console.log(`[DragStart] index=${index}`);

      const nextItems = internalItemsRef.current.slice();
      internalItemsRef.current = nextItems;
      setInternalItems(nextItems);
      setDraggedIndex(index);
      const transfer = dragEvent.dataTransfer;
      if (!transfer) {
        return;
      }
      transfer.effectAllowed = "move";
      transfer.setData("text/html", "");
      transfer.setDragImage(li, 0, 0);
    };

    const handleNativeDragEnter = (e: Event) => {
      const dragEvent = e as globalThis.DragEvent;
      dragEvent.preventDefault();
      const target = dragEvent.target as HTMLElement;
      const li = target.closest("li");
      if (!li || !listElement.contains(li)) return;

      const index = Array.from(listElement.children).indexOf(li);
      const currentDraggedIndex = draggedIndexRef.current;
      //console.log(`[DragEnter] index=${index}, draggedIndex=${currentDraggedIndex}`);

      if (currentDraggedIndex === null || currentDraggedIndex === index) {
        return;
      }

      // Live-reorder while hovering over list items.
      const nextItems = moveItem(internalItemsRef.current, currentDraggedIndex, index);
      setInternalItems(nextItems);
      setDraggedIndex(index);
    };

    const handleNativeDragOver = (e: Event) => {
      const dragEvent = e as globalThis.DragEvent;
      dragEvent.preventDefault();
      const transfer = dragEvent.dataTransfer;
      if (!transfer) {
        return;
      }
      transfer.dropEffect = "move";
    };

    const handleNativeDrop = (e: Event) => {
      const dragEvent = e as globalThis.DragEvent;
      dragEvent.preventDefault();
      //console.log(`[Drop] Clearing drag state as fallback, draggedIndex:`, draggedIndexRef.current);
      // Clear drag state here as fallback in case dragend doesn't fire
      setDraggedIndex(null);
      onReorder?.(internalItemsRef.current);
    };

    const handleNativeDragEnd = (_e: Event) => {
      //console.log(`[DragEnd] Clearing drag state, current draggedIndex:`, draggedIndexRef.current);
      setDraggedIndex(null);
      onReorder?.(internalItemsRef.current);
    };

    const handleNativeDeleteClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const button = target?.closest(".drag-drop-list-item-delete");
      if (!button || !listElement.contains(button)) {
        return;
      }

      const li = button.closest("li");
      if (!li) {
        return;
      }

      const index = Array.from(listElement.children).indexOf(li);
      if (index === -1) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      handleDeleteItem(index);
    };

    listElement.addEventListener("dragstart", handleNativeDragStart);
    listElement.addEventListener("dragenter", handleNativeDragEnter);
    listElement.addEventListener("dragover", handleNativeDragOver);
    listElement.addEventListener("drop", handleNativeDrop);
    listElement.addEventListener("dragend", handleNativeDragEnd);
    listElement.addEventListener("click", handleNativeDeleteClick);

    return () => {
      listElement.removeEventListener("dragstart", handleNativeDragStart);
      listElement.removeEventListener("dragenter", handleNativeDragEnter);
      listElement.removeEventListener("dragover", handleNativeDragOver);
      listElement.removeEventListener("drop", handleNativeDrop);
      listElement.removeEventListener("dragend", handleNativeDragEnd);
      listElement.removeEventListener("click", handleNativeDeleteClick);
    };
  }, [handleDeleteItem, onReorder]);

  const containerClassName = useMemo(() => {
    return className ? `drag-drop-list-container ${className}` : "drag-drop-list-container";
  }, [className]);

  const listClassName = useMemo(() => "drag-drop-list", []);

  const renderItems = internalItems || items;

  // Prepends a new item to the list and clears the input field.
  const handleAddItem = useCallback(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    const trimmed = inputElement.value.trim();
    if (!trimmed) {
      return;
    }

    const nextItems = [trimmed, ...internalItemsRef.current];
    internalItemsRef.current = nextItems;
    setInternalItems(nextItems);
    setDraggedIndex(null);
    onReorder?.(nextItems);
    inputElement.value = "";
    // Focus will be handled by autoFocus attribute on remount
  }, [onReorder]);

  useEffect(() => {
    const inputElement = inputRef.current;
    const buttonElement = addButtonRef.current;
    if (!inputElement || !buttonElement) {
      return;
    }

    // Bind native handlers to keep behavior consistent in embedded contexts.
    const handleNativeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddItem();
      }
    };

    const handleNativeClick = (event: Event) => {
      event.preventDefault();
      handleAddItem();
    };

    inputElement.addEventListener("keydown", handleNativeKeyDown);
    buttonElement.addEventListener("click", handleNativeClick);

    return () => {
      inputElement.removeEventListener("keydown", handleNativeKeyDown);
      buttonElement.removeEventListener("click", handleNativeClick);
    };
  }, [handleAddItem]);

  return (
    <div className={containerClassName}>
      <div className="drag-drop-list-controls">
        <input
          type="text"
          className="drag-drop-list-input"
          aria-label="Add item"
          ref={inputRef}
          autoFocus
        />
        <button
          type="button"
          className="drag-drop-list-add-button"
          aria-label="Add item to list"
          ref={addButtonRef}
        >
          Add
        </button>
      </div>
      <ul ref={listRef} id={id} className={listClassName} aria-label={ariaLabel}>
        {renderItems.map((item, index) => {
          const isDragging = draggedIndex === index;
          const itemClassName = isDragging
            ? "drag-drop-list-item is-dragging"
            : "drag-drop-list-item";
          const label = typeof item === "string" ? item : item.text;
          const key = typeof item === "string" ? `${item}-${index}` : item.id;

          return (
            <li key={key} className={itemClassName} draggable={true}>
              <span className="drag-drop-list-item-label">{label}</span>
              <button
                type="button"
                className="drag-drop-list-item-delete"
                aria-label={`Delete ${label}`}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
