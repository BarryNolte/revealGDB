/**
 * Provides mouse keyboard handler behavior for hex editor rendering, navigation, and input handling.
 *
 * @remarks
 * Exported symbols include `MouseEventType`, `MouseCallback`, `MouseKeyboardHandler`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
import { convertCharValue } from "./common";
import { ArrayChangeCallback } from "./hex-editor-types";
import {
  clampIndex,
  getColumnFromIndex,
  getRowFromIndex,
  parseIndexFromId,
} from "./HexEditorCursorMath";
import { resolveKeyAction } from "./HexEditorKeymap";

/** Type definition for mouse event types */
export type MouseEventType = "Over" | "Leave" | "Click";

/** Callback signature for mouse/keyboard events from view components */
export type MouseCallback = (type: MouseEventType, value: string) => void;

/** Identifier for view types (data or text) */
type ViewType = "d" | "t";

/**
 * Configuration object for each view type.
 * Defines how input is validated, normalized, and converted to byte values.
 */
type ViewInfo = {
  /** Maximum characters allowed per cell */
  numAllowedChars: number;
  /** Element ID prefix for routing events */
  idPrefix: string;
  /** Regex pattern to validate input characters */
  validChars: RegExp;
  /** Function to normalize/format input before storage */
  normalizeFunc: (value: string) => string;
  /** Function to convert normalized input to byte value (0-255) */
  convertToValue: (value: string) => number;
};

/**
 * View-specific configuration.
 * Single source of truth for how different view types handle input and data.
 * Extend this object to add new view types without modifying component logic.
 */
const viewTypeInfo: Record<ViewType, ViewInfo> = {
  // Data (hex) view: 2 hex chars per cell, converts to byte value
  d: {
    numAllowedChars: 2,
    idPrefix: "dIdx-",
    validChars: /^[0-9a-fA-F]$/,
    normalizeFunc: (value: string) =>
      parseInt(value, 16).toString(16).toUpperCase().padStart(2, "0"),
    convertToValue: (value: string) => parseInt(value, 16),
  },
  // Text view: 1 char per cell, converts to character code
  t: {
    numAllowedChars: 1,
    idPrefix: "tIdx-",
    validChars: /^.$/,
    normalizeFunc: (value: string) => value,
    convertToValue: (value: string) => value.charCodeAt(0),
  },
};

/**
 * MouseKeyboardHandler - Centralized event handler for all editor interactions.
 *
 * Responsibilities:
 * - Manage cell selection and editing state
 * - Validate and process keyboard input
 * - Synchronize updates across all views (hex, text, offset)
 * - Apply visual feedback (hover highlighting, edit cursor)
 *
 * Design Pattern:
 * - Single instance created per HexEditor component
 * - Stateless views pass events to this handler
 * - Handler updates DOM directly for synchronization
 * - Uses view configuration for polymorphic behavior
 */
export class MouseKeyboardHandler {
  // DOM stylesheet reference for dynamic highlighting
  private styleSheet = new CSSStyleSheet();
  // Style rule indices for cleanup
  private dynamicRowStyleIdx?: number = undefined;
  private dynamicColStyleIdx?: number = undefined;

  // Editing state
  private savedElementForEdit?: HTMLElement | null = null;
  private savedElementText?: string = "";
  private savedElementIndex: number = -1;
  private freshEdit: boolean = false;

  // Data context
  private datasourceLength: number;
  private dataChangeCallback?: ArrayChangeCallback = undefined;

  /**
   * Initialize the event handler.
   * @param {number} length - Length of the datasource for boundary validation
   * @param {ArrayChangeCallback} dataChangeCallback - Optional callback for data changes
   */
  constructor(length: number, dataChangeCallback?: ArrayChangeCallback) {
    document.adoptedStyleSheets = [this.styleSheet];
    this.datasourceLength = length;
    this.dataChangeCallback = dataChangeCallback;
  }

  /**
   * Performs on key down as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   *
   * @param e - Value for `e` consumed by this operation.
   */
  private onKeyDown(e: KeyboardEvent) {
    if (!this.savedElementForEdit) return;

    // Determine view type from element ID prefix
    const t = this.savedElementForEdit.id.charAt(0);
    if (t !== "d" && t !== "t") {
      return;
    }
    const vt = viewTypeInfo[t as ViewType];

    const action = resolveKeyAction(e.key, vt.validChars);

    if (action.type === "move") {
      const newIndex = clampIndex(this.savedElementIndex + action.delta, this.datasourceLength);
      this.moveEditControl(vt, newIndex);
      if (action.preventDefault) {
        e.preventDefault();
      }
      return;
    }

    if (action.type === "cancel") {
      if (this.savedElementForEdit) {
        this.savedElementForEdit.textContent = this.savedElementText || "";
      }
      this.restoreEditableElement();
      return;
    }

    if (action.type === "input" && this.savedElementForEdit) {
      // Clear cell on first keystroke
      if (this.freshEdit) {
        this.savedElementForEdit.textContent = "";
        this.freshEdit = false;
      }

      // Accumulate input
      this.savedElementForEdit.textContent += action.value;

      // Auto-advance to next cell when max chars reached
      if (this.savedElementForEdit.textContent.length >= vt.numAllowedChars) {
        const newIndex = clampIndex(this.savedElementIndex + 1, this.datasourceLength);
        this.moveEditControl(vt, newIndex);
      }
    }
  }

  /**
   * Performs move edit control as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   *
   * @param vt - Value for `vt` consumed by this operation.
   * @param newIndex - Zero-based index used to address a specific item.
   */
  private moveEditControl(vt: ViewInfo, newIndex: number) {
    this.restoreEditableElement();
    const element = document.getElementById(vt.idPrefix + newIndex);
    if (element) {
      this.savedElementForEdit = element;
      this.setupElementForEdit(vt.idPrefix + newIndex);
    }
  }

  /**
   * Performs setup element for edit as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  private setupElementForEdit(id: string) {
    if (!this.savedElementForEdit) return;

    const index = parseIndexFromId(id);
    if (index === null) {
      return;
    }

    this.freshEdit = true;
    this.savedElementText = this.savedElementForEdit.textContent || "";
    this.savedElementIndex = index;
    this.savedElementForEdit.classList.add("cursor");
    this.savedElementForEdit.tabIndex = -1;
    this.savedElementForEdit.focus();
    this.savedElementForEdit.onblur = () => {
      if (this.savedElementForEdit) {
        this.savedElementForEdit.classList.remove("cursor");
      }
    };
    this.savedElementForEdit.onkeydown = (e) => {
      this.onKeyDown(e);
    };
  }

  /**
   * Performs restore editable element as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   */
  private restoreEditableElement() {
    if (this.savedElementForEdit) {
      const t = this.savedElementForEdit.id.charAt(0);
      if (t !== "d" && t !== "t") {
        return;
      }
      const vt = viewTypeInfo[t as ViewType];

      // Clean up edit state
      this.savedElementForEdit.classList.remove("cursor");
      this.savedElementForEdit.onkeydown = null;
      this.savedElementForEdit.onblur = null;

      // Normalize the input value (format, padding, case conversion, etc.)
      this.savedElementForEdit.textContent = vt.normalizeFunc(
        this.savedElementForEdit.textContent || "",
      );

      // Convert normalized input to byte value
      const numValue = vt.convertToValue(this.savedElementForEdit.textContent);

      // If value changed, notify callback and sync other views
      if (this.savedElementForEdit.textContent !== this.savedElementText) {
        this.dataChangeCallback?.(this.savedElementIndex, numValue);

        // Update hex view with normalized hex value
        const dEl = document.getElementById(viewTypeInfo["d"].idPrefix + this.savedElementIndex);
        dEl?.classList.add("he-data-changed");
        if (dEl) {
          dEl.textContent = numValue.toString(16).toUpperCase().padStart(2, "0");
        }

        // Update text view with character representation
        const tEl = document.getElementById(viewTypeInfo["t"].idPrefix + this.savedElementIndex);
        tEl?.classList.add("he-data-changed");
        if (tEl) {
          tEl.textContent = convertCharValue(numValue, false);
        }
      }

      // Clear edit state
      this.savedElementForEdit = null;
      this.savedElementIndex = -1;
    }
  }

  /**
   * Performs add dynamic styles as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   *
   * @param id - Unique identifier used to look up the target entity.
   */
  private addDynamicStyles(id: string) {
    const parsedIndex = parseIndexFromId(id);
    if (parsedIndex === null) {
      return;
    }

    const row = getRowFromIndex(parsedIndex);
    this.dynamicRowStyleIdx = this.styleSheet.insertRule(
      `.row-${row} { background-color: rgba(255, 127, 47, 0.4); }`,
    );

    // Don't highlight columns for offset view (prefix 'o')
    if (id.charAt(0) !== "o") {
      const col = getColumnFromIndex(parsedIndex);
      this.dynamicColStyleIdx = this.styleSheet.insertRule(
        `.col-${col} { background-color: rgba(255, 127, 47, 0.4); }`,
      );
    }
  }

  /**
   * Removes dynamic styles from managed state.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   */
  private removeDynamicStyles(): void {
    if (this.dynamicRowStyleIdx !== undefined) {
      this.styleSheet.deleteRule(this.dynamicRowStyleIdx);
      this.dynamicRowStyleIdx = undefined;
    }
    if (this.dynamicColStyleIdx !== undefined) {
      this.styleSheet.deleteRule(this.dynamicColStyleIdx);
      this.dynamicColStyleIdx = undefined;
    }
  }

  /**
   * Performs handle mouse event as part of this module's public API.
   *
   * @remarks
   * Contributes to hex editor navigation, rendering synchronization, or edit workflows.
   *
   * @param type - Discriminator that identifies the message, record, or operation type.
   * @param id - Unique identifier used to look up the target entity.
   */
  handleMouseEvent(type: MouseEventType, id: string): void {
    switch (type) {
      case "Over":
        this.removeDynamicStyles();
        this.addDynamicStyles(id);
        break;
      case "Leave":
        this.removeDynamicStyles();
        break;
      case "Click":
        this.restoreEditableElement();
        this.savedElementForEdit = document.getElementById(id);
        this.setupElementForEdit(id);
        break;
    }
  }
}
