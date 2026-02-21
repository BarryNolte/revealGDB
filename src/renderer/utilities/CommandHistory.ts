/**
 * Command history manager for the GDB command window.
 *
 * Manages a list of previously executed commands with navigation support
 * using arrow keys (up/down). Implements features like:
 * - Automatic deduplication (moves duplicates to end)
 * - Maximum history size limit (100 commands)
 * - Navigation with getPrevious/getNext
 * - Empty command filtering
 */

export class CommandHistory {
  /** Array storing command history */
  private history: string[] = [];

  /** Current position in history for navigation */
  private historyIndex: number = 0;

  constructor() {}

  /**
   * Gets the complete command history array.
   * @returns Array of command strings
   */
  public get commandHistory(): string[] {
    return this.history;
  }

  /**
   * Completely disposes of the history and resets state.
   */
  dispose(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  /**
   * Clears all commands from history.
   */
  public clearHistory(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  /**
   * Resets navigation index to the end of history.
   * Call this after adding a new command or when user starts typing.
   */
  public reset(): void {
    this.historyIndex = this.history.length;
  }

  /**
   * Adds a command to the history.
   *
   * - Ignores empty/whitespace-only commands
   * - Removes existing duplicate and adds to end (moves to most recent)
   * - Limits history to 100 commands (removes oldest)
   * - Resets navigation index to end
   *
   * @param command - The command string to add
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
   * Navigates to the previous command in history.
   *
   * @returns The previous command, or undefined if at the beginning
   */
  public getPrevious(): string | undefined {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return undefined;
  }

  /**
   * Navigates to the next command in history.
   *
   * @returns The next command, or undefined if at the end
   */
  public getNext(): string | undefined {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    return undefined;
  }
}
