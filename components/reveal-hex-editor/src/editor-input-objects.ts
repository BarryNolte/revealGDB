export type OnChangeCallback = (key: string, idx: number) => void;

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export const asciiIdPrefix: string = "ascii-array-";
export const asciiClass: string = "ascii-char";
export const hexIdPrefix: string = "hex-array-";
export const hexClass: string = "hex-char";
export const rowOffsetIdPrefix: string = "row-offset-";
export const colHexOffsetIdPrefix: string = "edHeadH-";
export const colAscOffsetIdPrefix: string = "edHeadA-";

export class InputObjects {
  private _savedElement: Node | null = null;
  private _inputElement: HTMLInputElement | null = null;
  private _arraySize: number = 0;
  private _arrayIndex: number = NaN;
  private _inInputMode: boolean = false;
  private _onChange: OnChangeCallback;

  constructor() {
    this._inputElement = document.createElement("input");
    this._inputElement.maxLength = 1;
    this._inputElement.style.borderWidth = "0px";
    this._inputElement.style.boxShadow = "0px";
    this._inputElement.style.width = "10px";
    this._inputElement.style.height = "16px";
    this._inputElement.style.fontSize = "14px";
    this._inputElement.style.paddingInline = "0px";
    this._inputElement.style.backgroundColor = "lightgrey";
    this._inputElement.onblur = () => {
      //this.RevertToStaticValue();
    };
    this._inputElement.onkeyup = (e: KeyboardEvent) => {
      this.keyboardHandler(e);
    };

    this._onChange = () => {};
  }

  get onChange() {
    return this._onChange;
  }
  set onChange(cb) {
    this._onChange = cb;
  }

  get savedElement() {
    return this._savedElement;
  }
  set savedElement(el) {
    this._savedElement = el;
  }

  get inputElement() {
    return this._inputElement;
  }
  set inputElement(el) {
    this._inputElement = el;
  }

  get arrayIndex(): number {
    return this._arrayIndex;
  }

  set arrayIndex(i: number) {
    this._arrayIndex = i;
  }

  get arraySize(): number {
    return this._arraySize;
  }

  set arraySize(n: number) {
    this._arraySize = n;
  }

  get inInputMode(): boolean {
    return this._inInputMode;
  }

  public GoToClickedInputControl(x: number, y: number) {
    const element = document.elementFromPoint(x, y);
    if (element) {
      this.TransformToEditElement(element);
    }
  }

  private TransformToEditElement(element: Element) {
    if (element.className.indexOf(asciiClass) > -1) {
      if (this._savedElement) {
        this.RevertToStaticValue();
      }

      this._savedElement = element;
      const id: number = parseInt(element.id.replace(asciiIdPrefix, ""));
      this._arrayIndex = id;

      element?.replaceWith(this._inputElement || "");
      this.inputElement?.focus();

      this._inInputMode = true;
    } else {
      // Clicked on ascii control, but not a character
      // Revert things...
      this.RevertToStaticValue();
    }
  }

  private RevertToStaticValue() {
    if (this._inputElement) {
      console.assert(this._savedElement !== null);
      this._inputElement.replaceWith(this._savedElement!);
      this._inputElement.value = "";

      this._inInputMode = false;

      this._savedElement = null;
    }
  }

  private MoveInput(direction: Direction) {
    let ctrlIdx = this._arrayIndex;
    switch (direction) {
      case Direction.Right:
        {
          ctrlIdx++;
        }
        break;
      case Direction.Left:
        {
          ctrlIdx--;
        }
        break;
      case Direction.Up:
        {
          ctrlIdx -= 16;
        }
        break;
      case Direction.Down:
        {
          ctrlIdx += 16;
        }
        break;
      default: {
        console.log("Default");
      }
    }

    if (ctrlIdx < 0 || ctrlIdx > this.arraySize - 1) return;

    this.RevertToStaticValue();
    const element = document.getElementById(asciiIdPrefix + ctrlIdx);
    if (element) {
      this.TransformToEditElement(element);
    }
  }

  private keyboardHandler(e: KeyboardEvent): void {
    switch (e.key) {
      case "Escape":
        {
          this.RevertToStaticValue();
        }
        break;
      case "Enter":
        {
          console.log("Update Memory => " + this.inputElement?.value);
          this.RevertToStaticValue();
        }
        break;
      case "ArrowRight":
        {
          this.MoveInput(Direction.Right);
        }
        break;
      case "ArrowLeft":
        {
          this.MoveInput(Direction.Left);
        }
        break;
      case "ArrowUp":
        {
          this.MoveInput(Direction.Up);
        }
        break;
      case "ArrowDown":
        {
          this.MoveInput(Direction.Down);
        }
        break;
      default: {
        this.onChange(e.key, this.arrayIndex);

        //this.RevertToStaticValue();
        this.MoveInput(Direction.Right);
      }
    }
  }
}
