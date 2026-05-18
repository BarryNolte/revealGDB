import { escapeHtml } from "../../../renderer/ToolWindows/gdb-value-formatter";

/**
 * Implements gdb locals logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `Local`, `LocalsContainer`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
export class Local {
  name: string;
  value: string;
  sublocals: Local[];
  fullpath: string;

  constructor(name: string, value: string, parentFullpath?: string) {
    this.name = name;
    this.value = value;
    this.sublocals = [];
    // Set fullpath based on whether there's a parent
    // Skip anonymous markers in the path - they should be transparent to the fullpath
    if (name.startsWith(LocalsContainer.anonMarker)) {
      this.fullpath = parentFullpath || name;
    } else {
      this.fullpath = parentFullpath ? `${parentFullpath}.${name}` : name;
    }
  }

  /**
   * Performs add local as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param local - Value for `local` consumed by this operation.
   */
  addLocal(local: Local): void {
    if (local === this) {
      return;
    }

    if (this.sublocals.includes(local)) {
      return;
    }

    // Recalculate the child's fullpath based on this local's fullpath
    // Skip anonymous markers in the path - they should be transparent to the fullpath
    if (local.name.startsWith(LocalsContainer.anonMarker)) {
      local.fullpath = this.fullpath;
    } else {
      local.fullpath = `${this.fullpath}.${local.name}`;
    }
    this.sublocals.push(local);
  }
}

/**
 * Defines the different types of values that can be parsed
 * Used to determine the parsing strategy for different value structures
 */
export enum valueType {
  plain, // value is a simple value, like a number or string
  simpleGroup, // value is a simple group of values, like {a = 0x1, b = 0x2}
  complexGroup, // value is a complex group of values, like {a = 0x1, b = {c = 0x2, d = 0x3}}
}

/**
 * Defines the different token types in the input stream
 * Used for parsing and creating the mask array that tracks token positions
 */
export enum streamType {
  leftBracket = 2, // Opening brace character
  rightBracket = 4, // Closing brace character
  name = 1, // Variable name token
  value = 0, // Variable value token
  equals = 3, // Equals sign token
}

export type TokenChunk = {
  val: string;
  type: streamType;
};

/**
 * Container class that parses and stores local variables in a tree structure
 * Handles complex nested structures using a character-by-character parsing approach
 */
export class LocalsContainer {
  /** Marker used to identify anonymous unions and structs during parsing */
  static anonMarker: string = "anon_union_or_struct_"; //TODO: shorten this?

  /** Original input string to be parsed */
  input: string;

  /** Array of parsed top-level Local objects */
  locals: Local[] = [];

  /** Tracks the type of each character in the input string during parsing */
  nameValMask: streamType[] = [];

  private valueParsers: Record<valueType, (name: string, value: string) => Local> = {
    [valueType.plain]: (name: string, value: string) => new Local(name, value),
    [valueType.simpleGroup]: (name: string, value: string) => this.parseSimpleValue(name, value),
    [valueType.complexGroup]: (name: string, value: string) => this.parseComplexValue(name, value),
  };

  /**
   * Creates a new LocalsContainer and parses the input string
   * @param inputString Raw string containing name-value pairs to parse
   */
  constructor(inputString: string) {
    this.input = inputString;

    // Make anonymous unions and structs easier to parses
    const varsRegx = /, {/gm;
    let cnt = 0;
    this.input = this.input.replaceAll(varsRegx, () => {
      return `, ${LocalsContainer.anonMarker}${cnt++} = {`;
    });

    const vars = this.input.split("},{");
    vars.forEach((chunk) => {
      const rr = /name="(?<name>[^"]*)",value="(?<value>.*)/g.exec(chunk);
      if (!rr) return; // skip if no match or error

      const name = rr.groups?.name ?? "";
      const value = this.cleanValue(rr.groups?.value ?? "");

      const parser = this.valueParsers[this.getValueType(value)];
      this.locals.push(parser(name, escapeHtml(value)));
    });
  }

  /**
   * Parses input into complex value data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param name - Value for `name` consumed by this operation.
   * @param value - Value to validate, normalize, or transform before further processing.
   * @returns The computed result produced by this operation.
   */
  private parseComplexValue(name: string, value: string): Local {
    const chunks = this.createComplexChunks(value);

    // Some debugger values (for example Rust Display/Debug strings) can contain
    // many braces but no parseable MI-style `field = value` pairs.
    // In those cases, preserve the whole value as a plain scalar.
    const hasNamedFields = chunks.some(
      (chunk) => chunk.type === streamType.name && chunk.val.trim().length > 0,
    );

    if (!hasNamedFields) {
      return new Local(name, value);
    }

    return this.parseComplexChunks(name, chunks);
  }

  /**
   * Creates complex chunks for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param value - Value to validate, normalize, or transform before further processing.
   * @returns The resulting collection produced by this operation.
   */
  private createComplexChunks(value: string): TokenChunk[] {
    // Stage 1: classify each character into token stream masks.
    this.initMasks(value);
    this.createNameValMask(value);
    this.createBracketMask(value);
    this.createEqualsMask(value);

    // Stage 2: compress per-character masks into token chunks.
    const chunks: TokenChunk[] = [];
    let lastMaskVal = this.nameValMask[0];
    let chunk = "";

    for (let i = 0; i < value.length; i++) {
      const currentMask = this.nameValMask[i];
      const ch = value[i];

      if (currentMask !== lastMaskVal || ch === "{" || ch === "}") {
        chunks.push({ val: chunk, type: lastMaskVal });
        chunk = "";
      }

      chunk += ch;
      lastMaskVal = currentMask;
    }

    chunks.push({ val: chunk, type: lastMaskVal });
    return chunks;
  }

  /**
   * Parses input into complex chunks data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param name - Value for `name` consumed by this operation.
   * @param chunks - Value for `chunks` consumed by this operation.
   * @returns The computed result produced by this operation.
   */
  private parseComplexChunks(name: string, chunks: TokenChunk[]): Local {
    const rootLocal = new Local(name, "");
    let curLocal: Local = rootLocal;
    const localStack: Local[] = [];

    /**
     * Performs top of stack as part of this module's internal workflow.
     *
     * @remarks
     * Participates in the MI processing pipeline that updates debugger state and notifications.
     *
     * @returns The computed result produced by this operation.
     */
    const topOfStack = (): Local | undefined => {
      if (localStack.length === 0) {
        return undefined;
      }
      return localStack[localStack.length - 1];
    };

    /**
     * Performs collapse top of stack as part of this module's internal workflow.
     *
     * @remarks
     * Participates in the MI processing pipeline that updates debugger state and notifications.
     */
    const collapseTopOfStack = (): void => {
      if (localStack.length < 2) {
        return;
      }

      const child = localStack.pop()!;
      const parent = localStack[localStack.length - 1];

      if (parent === child) {
        return;
      }

      parent.addLocal(child);
    };

    const handlers = new Map<streamType, (chunk: TokenChunk) => void>([
      [
        streamType.value,
        (chunk: TokenChunk) => {
          if (chunk.val.length === 2 && chunk.val.startsWith(", ")) {
            return;
          }

          if (chunk.val.endsWith(", ")) {
            chunk.val = chunk.val.substring(0, chunk.val.length - 2);
          }

          curLocal.value = chunk.val;

          if (topOfStack() !== curLocal) {
            topOfStack()?.addLocal(curLocal);
          }
        },
      ],
      [
        streamType.name,
        (chunk: TokenChunk) => {
          const parentFullpath = topOfStack()?.fullpath;
          curLocal = new Local(chunk.val, "", parentFullpath);
        },
      ],
      [
        streamType.leftBracket,
        (chunk: TokenChunk) => {
          if (chunk.val !== "" && topOfStack() !== curLocal) {
            localStack.push(curLocal);
          }
        },
      ],
      [
        streamType.rightBracket,
        () => {
          collapseTopOfStack();
        },
      ],
      [
        streamType.equals,
        () => {
          // Ignore the equals sign.
        },
      ],
    ]);

    chunks.forEach((chunk) => {
      handlers.get(chunk.type)?.(chunk);
    });

    return rootLocal;
  }

  /**
   * Parses input into simple value data.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param name - Value for `name` consumed by this operation.
   * @param value - Value to validate, normalize, or transform before further processing.
   * @returns The computed result produced by this operation.
   */
  private parseSimpleValue(name: string, value: string): Local {
    const varsRegx = /[{, ](?<name>[a-zA-Z_][a-zA-Z0-9_]*) = (?<value>[^,]*)[,}]/gm;
    const vars = value.matchAll(varsRegx);
    const retValue: Local = new Local(name, "");

    const arr = vars.toArray();

    if (arr.length === 0) {
      retValue.value = value;
      return retValue;
    }

    arr.forEach((v) => {
      const newLocal: Local = new Local(
        v.groups?.name ?? "",
        v.groups?.value ?? "",
        retValue.fullpath,
      );
      retValue.sublocals.push(newLocal);
    });

    return retValue;
  }

  /**
   * Performs init masks as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param value - Value to validate, normalize, or transform before further processing.
   */
  private initMasks(value: string) {
    // Initialize the nameValMask array with the length of the input value
    this.nameValMask = [value.length];

    // Set all elements of the nameValMask array to 'value'
    for (let i = 0; i < value.length; i++) {
      this.nameValMask[i] = streamType.value;
    }
  }

  /**
   * Creates bracket mask for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param chunk - Value for `chunk` consumed by this operation.
   */
  private createBracketMask(chunk: string): void {
    for (let i = 0; i < chunk.length; i++) {
      switch (chunk[i]) {
        case "{":
          this.nameValMask[i] = streamType.leftBracket;
          break;
        case "}":
          this.nameValMask[i] = streamType.rightBracket;
          break;
      }
    }
  }

  /**
   * Creates equals mask for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param chunk - Value for `chunk` consumed by this operation.
   */
  private createEqualsMask(chunk: string): void {
    const varsRegx = /(?<ign> = )/gm;
    const varEquals = chunk.matchAll(varsRegx);
    const varArray = Array.from(varEquals);

    for (let i = 0; i < varArray.length; i++) {
      const v = varArray[i];
      if (!v.groups) continue; // skip if no groups found

      for (let i = v.index; i < v.index + v.groups.ign.length; i++) {
        this.nameValMask[i] = streamType.equals;
      }
    }
  }

  /**
   * Creates name val mask for downstream use.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param chunk - Value for `chunk` consumed by this operation.
   */
  private createNameValMask(chunk: string): void {
    const varsRegx = /(?<name>[a-zA-Z_][a-zA-Z0-9_]*)(?<ign> = )/gm;
    const varNames = chunk.matchAll(varsRegx);
    const varArray = Array.from(varNames);

    for (let i = 0; i < varArray.length; i++) {
      const v = varArray[i];
      if (!v.groups) continue; // skip if no groups found

      for (let i = v.index; i < v.index + v.groups.name.length!; i++) {
        this.nameValMask[i] = streamType.name;
      }
    }
  }

  /**
   * Returns value type from current state.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param value - Value to validate, normalize, or transform before further processing.
   * @returns The computed result produced by this operation.
   */
  private getValueType(value: string): valueType {
    let bracketCount = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] === "{") {
        bracketCount++;
      }

      if (bracketCount === 2) {
        return valueType.complexGroup;
      }
    }

    if (bracketCount === 1) {
      return valueType.simpleGroup;
    }

    return valueType.plain;
  }

  /**
   * Performs clean value as part of this module's public API.
   *
   * @remarks
   * Participates in the MI processing pipeline that updates debugger state and notifications.
   *
   * @param value - Value to validate, normalize, or transform before further processing.
   * @returns The resulting string value produced by this operation.
   */
  private cleanValue(value: string): string {
    const li = value.lastIndexOf('"') ?? -1;
    const retVal = value.substring(0, li);
    return retVal;
  }
}

// Demo code showing usage of the LocalsContainer
//console.log(`input: ${input}`);
//console.log(`input length: ${input.length}`);
//console.log("");

// Parse the input and create the local variable tree
//const lc = new LocalsContainer(input);
// const lc = new LocalsContainer("{}");
// console.log(lc.locals);

// console.log("");
// console.log("");

// // Output the parsed structure in a readable JSON format
// console.log("Locals in a tree structure:");
// console.log(JSON.stringify(lc.locals, null, 2));
// console.log("");
