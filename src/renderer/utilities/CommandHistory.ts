/**
 * Provides command history renderer utilities for formatting, state shaping, and shared view logic.
 *
 * @remarks
 * Exported symbols include `CommandHistory`. Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
export class CommandHistory {
  /** Array storing command history */
  private history: string[] = [];

  /** Current position in history for navigation */
  private historyIndex: number = 0;

  constructor() {}

  /**
   * Performs getcommand history as part of this module's public API.
   *
   * @returns The resulting collection produced by this operation.
   */
  public get commandHistory(): string[] {
    return this.history;
  }

  /**
   * Performs dispose as part of this module's public API.
   */
  // fallow-ignore-next-line unused-class-member
  dispose(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  /**
   * Clears history from managed state.
   */
  public clearHistory(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  /**
   * Performs reset as part of this module's public API.
   */
  public reset(): void {
    this.historyIndex = this.history.length;
  }

  /**
   * Performs add as part of this module's public API.
   *
   * @param command - Debugger command text or command descriptor to execute.
   */
  public add(command: string): void {
    // Filter out empty strings
    if (command.replaceAll(" ", "") === "") {
      return;
    }

    // Remove any existing duplicate (will be re-added at end)
    const existingIndex = this.history.indexOf(command);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // Add the command at the end of the history
    this.history.push(command);

    // Enforce maximum history size
    if (this.history.length > 100) {
      this.history.shift();
    }

    this.historyIndex = this.history.length;
  }

  /**
   * Returns previous from current state.
   *
   * @returns The computed result produced by this operation.
   */
  // fallow-ignore-next-line unused-class-member
  public getPrevious(): string | undefined {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return undefined;
  }

  /**
   * Returns next from current state.
   *
   * @returns The computed result produced by this operation.
   */
  // fallow-ignore-next-line unused-class-member
  public getNext(): string | undefined {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    return undefined;
  }
}
