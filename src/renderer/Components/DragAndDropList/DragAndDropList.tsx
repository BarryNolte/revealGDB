/**
 * Defines the drag and drop list renderer component and supporting presentation logic.
 *
 * @remarks
 * Exported symbols include `DragAndDropListItem`, `DragAndDropListProps`, `DragAndDropList`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
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
 * Performs moveItem as part of this module's internal workflow.
 *
 * @param items - items parameter.
 * @param fromIndex - fromIndex parameter.
 * @param toIndex - toIndex parameter.
 * @returns The computed result produced by this operation.
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
/**
 * Performs nativeDragStart as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @param listElement - listElement parameter.
 * @param internalItemsRef - internalItemsRef parameter.
 * @param setInternalItems - setInternalItems parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDragStart(
  e: Event,
  listElement: HTMLUListElement,
  internalItemsRef: { current: DragAndDropListItem[] },
  setInternalItems: (items: DragAndDropListItem[]) => void,
  setDraggedIndex: (index: number | null) => void,
): void {
  const dragEvent = e as globalThis.DragEvent;
  const target = dragEvent.target as HTMLElement;
  const li = target.closest("li");
  if (!li || !listElement.contains(li)) return;
  const index = Array.from(listElement.children).indexOf(li);
  const nextItems = internalItemsRef.current.slice();
  internalItemsRef.current = nextItems;
  setInternalItems(nextItems);
  setDraggedIndex(index);
  const transfer = dragEvent.dataTransfer;
  if (!transfer) return;
  transfer.effectAllowed = "move";
  transfer.setData("text/html", "");
  transfer.setDragImage(li, 0, 0);
}
/**
 * Performs nativeDragEnter as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @param listElement - listElement parameter.
 * @param internalItemsRef - internalItemsRef parameter.
 * @param draggedIndexRef - draggedIndexRef parameter.
 * @param setInternalItems - setInternalItems parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDragEnter(
  e: Event,
  listElement: HTMLUListElement,
  internalItemsRef: { current: DragAndDropListItem[] },
  draggedIndexRef: { current: number | null },
  setInternalItems: (items: DragAndDropListItem[]) => void,
  setDraggedIndex: (index: number | null) => void,
): void {
  const dragEvent = e as globalThis.DragEvent;
  dragEvent.preventDefault();
  const target = dragEvent.target as HTMLElement;
  const li = target.closest("li");
  if (!li || !listElement.contains(li)) return;
  const index = Array.from(listElement.children).indexOf(li);
  const currentDraggedIndex = draggedIndexRef.current;
  if (currentDraggedIndex === null || currentDraggedIndex === index) return;
  const nextItems = moveItem(internalItemsRef.current, currentDraggedIndex, index);
  setInternalItems(nextItems);
  setDraggedIndex(index);
}
/**
 * Performs nativeDragOver as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDragOver(e: Event): void {
  const dragEvent = e as globalThis.DragEvent;
  dragEvent.preventDefault();
  const transfer = dragEvent.dataTransfer;
  if (!transfer) return;
  transfer.dropEffect = "move";
}
/**
 * Performs nativeDrop as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @param internalItemsRef - internalItemsRef parameter.
 * @param setDraggedIndex - setDraggedIndex parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDrop(
  e: Event,
  internalItemsRef: { current: DragAndDropListItem[] },
  setDraggedIndex: (index: number | null) => void,
  onReorder?: (items: DragAndDropListItem[]) => void,
): void {
  const dragEvent = e as globalThis.DragEvent;
  dragEvent.preventDefault();
  setDraggedIndex(null);
  onReorder?.(internalItemsRef.current);
}
/**
 * Performs nativeDragEnd as part of this module's internal workflow.
 *
 * @param internalItemsRef - internalItemsRef parameter.
 * @param setDraggedIndex - setDraggedIndex parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDragEnd(
  internalItemsRef: { current: DragAndDropListItem[] },
  setDraggedIndex: (index: number | null) => void,
  onReorder?: (items: DragAndDropListItem[]) => void,
): void {
  setDraggedIndex(null);
  onReorder?.(internalItemsRef.current);
}
/**
 * Performs nativeDeleteClick as part of this module's internal workflow.
 *
 * @param e - e parameter.
 * @param listElement - listElement parameter.
 * @param handleDeleteItem - handleDeleteItem parameter.
 * @returns The computed result produced by this operation.
 */

function nativeDeleteClick(
  e: Event,
  listElement: HTMLUListElement,
  handleDeleteItem: (index: number) => void,
): void {
  const target = e.target as HTMLElement | null;
  const button = target?.closest(".drag-drop-list-item-delete");
  if (!button || !listElement.contains(button)) return;
  const li = button.closest("li");
  if (!li) return;
  const index = Array.from(listElement.children).indexOf(li);
  if (index === -1) return;
  e.preventDefault();
  e.stopPropagation();
  handleDeleteItem(index);
}
/**
 * Performs renderListItem as part of this module's internal workflow.
 *
 * @param item - item parameter.
 * @param index - index parameter.
 * @param draggedIndex - draggedIndex parameter.
 * @returns The computed result produced by this operation.
 */

function renderListItem(
  item: DragAndDropListItem,
  index: number,
  draggedIndex: number | null,
): JSX.Element {
  const isDragging = draggedIndex === index;
  const itemClassName = isDragging ? "drag-drop-list-item is-dragging" : "drag-drop-list-item";
  const label = typeof item === "string" ? item : item.text;
  const key = typeof item === "string" ? `${item}-${index}` : item.id;
  return (
    <li key={key} className={itemClassName} draggable={true}>
      <span className="drag-drop-list-item-label">{label}</span>
      <button type="button" className="drag-drop-list-item-delete" aria-label={`Delete ${label}`}>
        Delete
      </button>
    </li>
  );
}
/**
 * Performs useAddItem as part of this module's internal workflow.
 *
 * @param internalItemsRef - internalItemsRef parameter.
 * @param setInternalItems - setInternalItems parameter.
 * @returns The computed result produced by this operation.
 */

function useAddItem(
  internalItemsRef: { current: DragAndDropListItem[] },
  setInternalItems: (items: DragAndDropListItem[]) => void,
  setDraggedIndex: (index: number | null) => void,
  onReorder?: (items: DragAndDropListItem[]) => void,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const handleAddItem = useCallback(() => {
    const inputElement = inputRef.current;
    if (!inputElement) return;
    const trimmed = inputElement.value.trim();
    if (!trimmed) return;
    const nextItems = [trimmed, ...internalItemsRef.current];
    internalItemsRef.current = nextItems;
    setInternalItems(nextItems);
    setDraggedIndex(null);
    onReorder?.(nextItems);
    inputElement.value = "";
  }, [internalItemsRef, setInternalItems, setDraggedIndex, onReorder]);

  useEffect(() => {
    const inputElement = inputRef.current;
    const buttonElement = addButtonRef.current;
    if (!inputElement || !buttonElement) return;
    /**
     * Performs handleNativeKeyDown as part of this module's internal workflow.
     *
     * @param event - event parameter.
     * @returns The computed result produced by this operation.
     */
    const handleNativeKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddItem();
      }
    };
    /**
     * Performs handleNativeClick as part of this module's internal workflow.
     *
     * @param event - event parameter.
     * @returns The computed result produced by this operation.
     */
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

  return { inputRef, addButtonRef };
}
/**
 * Performs useDragListeners as part of this module's internal workflow.
 *
 * @param listRef - listRef parameter.
 * @param internalItemsRef - internalItemsRef parameter.
 * @param draggedIndexRef - draggedIndexRef parameter.
 * @param setInternalItems - setInternalItems parameter.
 * @returns The computed result produced by this operation.
 */

function useDragListeners(
  listRef: { current: HTMLUListElement | null },
  internalItemsRef: { current: DragAndDropListItem[] },
  draggedIndexRef: { current: number | null },
  setInternalItems: (items: DragAndDropListItem[]) => void,
  setDraggedIndex: (index: number | null) => void,
  handleDeleteItem: (index: number) => void,
  onReorder?: (items: DragAndDropListItem[]) => void,
): void {
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;
    /**
     * Performs onDragStart as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const onDragStart = (e: Event) =>
      nativeDragStart(e, listElement, internalItemsRef, setInternalItems, setDraggedIndex);
    /**
     * Performs onDragEnter as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const onDragEnter = (e: Event) =>
      nativeDragEnter(
        e,
        listElement,
        internalItemsRef,
        draggedIndexRef,
        setInternalItems,
        setDraggedIndex,
      );
    /**
     * Performs onDragOver as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const onDragOver = (e: Event) => nativeDragOver(e);
    /**
     * Performs onDrop as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const onDrop = (e: Event) => nativeDrop(e, internalItemsRef, setDraggedIndex, onReorder);
    /**
     * Performs onDragEnd as part of this module's internal workflow.
     *
     * @returns The computed result produced by this operation.
     */
    const onDragEnd = () => nativeDragEnd(internalItemsRef, setDraggedIndex, onReorder);
    /**
     * Performs onDeleteClick as part of this module's internal workflow.
     *
     * @param e - e parameter.
     * @returns The computed result produced by this operation.
     */
    const onDeleteClick = (e: Event) => nativeDeleteClick(e, listElement, handleDeleteItem);
    listElement.addEventListener("dragstart", onDragStart);
    listElement.addEventListener("dragenter", onDragEnter);
    listElement.addEventListener("dragover", onDragOver);
    listElement.addEventListener("drop", onDrop);
    listElement.addEventListener("dragend", onDragEnd);
    listElement.addEventListener("click", onDeleteClick);
    return () => {
      listElement.removeEventListener("dragstart", onDragStart);
      listElement.removeEventListener("dragenter", onDragEnter);
      listElement.removeEventListener("dragover", onDragOver);
      listElement.removeEventListener("drop", onDrop);
      listElement.removeEventListener("dragend", onDragEnd);
      listElement.removeEventListener("click", onDeleteClick);
    };
  }, [handleDeleteItem, onReorder]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function DragAndDropList({
  id,
  items,
  onReorder,
  ariaLabel = "Reorder list",
  className,
}: DragAndDropListProps): JSX.Element {
  const [internalItems, setInternalItems] = useState<DragAndDropListItem[] | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const internalItemsRef = useRef<DragAndDropListItem[]>(items);

  useEffect(() => {
    draggedIndexRef.current = draggedIndex;
  }, [draggedIndex]);
  useEffect(() => {
    internalItemsRef.current = internalItems ?? items;
  }, [internalItems, items]);
  useEffect(() => {
    internalItemsRef.current = items;
  }, [items]);
  useEffect(() => {
    if (!listRef.current || typeof ResizeObserver === "undefined") return;
  }, []);

  const handleDeleteItem = useCallback(
    (index: number) => {
      const nextItems = internalItemsRef.current.filter((_, itemIndex) => itemIndex !== index);
      internalItemsRef.current = nextItems;
      setInternalItems(nextItems);
      setDraggedIndex(null);
      onReorder?.(nextItems);
    },
    [onReorder],
  );

  useDragListeners(
    listRef,
    internalItemsRef,
    draggedIndexRef,
    setInternalItems,
    setDraggedIndex,
    handleDeleteItem,
    onReorder,
  );

  const base = "drag-drop-list-container";
  const containerClassName = className ? `${base} ${className}` : base;
  const listClassName = useMemo(() => "drag-drop-list", []);
  const renderItems = internalItems || items;
  const { inputRef, addButtonRef } = useAddItem(
    internalItemsRef,
    setInternalItems,
    setDraggedIndex,
    onReorder,
  );

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
        {renderItems.map((item, index) => renderListItem(item, index, draggedIndex))}
      </ul>
    </div>
  );
}
