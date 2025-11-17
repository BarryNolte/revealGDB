export class CommandHistory {
  private history: string[] = [];
  private historyIndex: number = 0;

  constructor() {}

  public get commandHistory(): string[] {
    return this.history;
  }

  dispose(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  public clearHistory(): void {
    this.history = [];
    this.historyIndex = 0;
  }

  public reset(): void {
    this.historyIndex = this.history.length;
  }

  public add(command: string): void {
    // No empty strings
    if (command.replaceAll(" ", "") === "") {
      return;
    }

    // Remove any existing duplicate of the command
    const existingIndex = this.history.indexOf(command);
    if (existingIndex !== -1) {
      this.history.splice(existingIndex, 1);
    }

    // Add the command at the end of the history
    this.history.push(command);

    // Limit the history to 100 commands
    if (this.history.length > 100) {
      this.history.shift();
    }

    this.historyIndex = this.history.length;
  }

  public getPrevious(): string | undefined {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      return this.history[this.historyIndex];
    }
    return undefined;
  }

  public getNext(): string | undefined {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      return this.history[this.historyIndex];
    }
    return undefined;
  }
}
