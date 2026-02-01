/**
 * Sample input string representing a complex nested data structure
 * Format: series of name-value pairs containing various data types and nested structures
 */
// const input =
//   '{name="mbs",value="{pd = 0x800e30c0 <error: Cannot access memory at address 0x800e30c0>, ms = {a = 0x3, b = 0x58, {c = "\\240", <incomplete sequence \\373>, d = 0x3ffb3da0}, e = 0x80, embed_t = {i = 0xc, o = 0x10, x = 0x3ffb3da03f401ed8}, h = 0x80, {f = 0xc, g = 0x80085d14}}, arr = {0x0, 0x0, 0x3ffb3da0, 0x3ffb3d80, 0xc, 0x1}, bf1 = {x = 0x4, y = 0x1, z = 0x0}, bf2 = {x = 0x0, y = 0x38, z = 0xfffffecf}}"},{name="chip_info",value="{model = 0, features = 0x66c, revision = 0x1e58, cores = 0x40}"},{name="flash_size",value="0x3ffb3dc0"},{name="major_rev",value="<optimized out>"},{name="minor_rev",value="<optimized out>"}';

/**
 * Represents all possible values that a Local variable can hold
 * - string: Simple value
 * - undefined: Uninitialized value
 */
//type LocalValue = string;

/**
 * Represents a local variable with a name and value
 * Can contain nested structures through the subLocals property
 */
export class Local {
  name: string;
  value: string;
  sublocals: Local[];

  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
    this.sublocals = [];
  }

  /**
   * Adds a child Local object to this Local's subLocals array
   * @param local The Local object to add as a child
   */
  addLocal(local: Local): void {
    this.sublocals.push(local);
  }
}

/**
 * Defines the different types of values that can be parsed
 * Used to determine the parsing strategy for different value structures
 */
enum valueType {
  plain, // value is a simple value, like a number or string
  simpleGroup, // value is a simple group of values, like {a = 0x1, b = 0x2}
  complexGroup, // value is a complex group of values, like {a = 0x1, b = {c = 0x2, d = 0x3}}
}

/**
 * Defines the different token types in the input stream
 * Used for parsing and creating the mask array that tracks token positions
 */
enum streamType {
  leftBracket = 2, // Opening brace character
  rightBracket = 4, // Closing brace character
  name = 1, // Variable name token
  value = 0, // Variable value token
  equals = 3, // Equals sign token
}

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

      const vType = this.getValueType(value);

      switch (vType) {
        case valueType.plain:
          {
            // value is the value
            this.locals.push(new Local(name, value));
          }
          break;
        case valueType.simpleGroup:
          {
            // simple group
            this.locals.push(this.parseSimpleValue(name, value));
          }
          break;
        case valueType.complexGroup:
          {
            // complex group
            this.locals.push(this.parseComplexValue(name, value));
          }
          break;
      }
    });
  }

  /**
   * Parses a complex value containing nested structures
   * Uses character-by-character parsing with token type masks
   * @param name The name of the root local variable
   * @param value The complex value string to parse
   * @returns A Local object containing the parsed nested structure
   */
  private parseComplexValue(name: string, value: string): Local {
    const complexValue = value;

    // Identify all the bits and pieces of the complex value
    this.initMasks(complexValue);
    this.createNameValMask(complexValue);
    this.createBracketMask(complexValue);
    this.createEqualsMask(complexValue);

    const chunks: { val: string; type: streamType }[] = [];

    let lastMaskVal: number = this.nameValMask[0];
    let chunk: string = "";

    for (let i = 0; i < complexValue.length; i++) {
      const nv = this.nameValMask[i];
      const ch = complexValue[i];

      if (nv !== lastMaskVal || ch === "{" || ch === "}") {
        chunks.push({ val: chunk, type: lastMaskVal });
        chunk = "";
      }
      chunk += ch;

      lastMaskVal = nv;
    }
    chunks.push({ val: chunk, type: lastMaskVal }); // push the last chunk

    const rootLocal: Local = new Local(name, "");
    let curLocal: Local = rootLocal;

    const localStack: Local[] = [];

    /**
     * Returns the Local object at the top of the parsing stack
     * @returns The top Local object or undefined if stack is empty
     */
    function topOfStack(): Local | undefined {
      if (localStack.length === 0) return undefined;
      return localStack[localStack.length - 1];
    }

    /**
     * Collapses the top Local object into its parent in the stack
     * Only collapses if there are at least two items in the stack
     */
    function collapseTopOfStack(): void {
      if (localStack.length < 2) return;
      localStack[localStack.length - 2].addLocal(localStack.pop()!);
    }

    chunks.forEach((c) => {
      switch (c.type) {
        case streamType.value:
          {
            if (c.val.length === 2 && c.val.startsWith(", ")) {
              // This is an artifact of the parsing, ignore it.
              break;
            } else {
              const delim = c.val.endsWith(", ");

              if (delim) {
                c.val = c.val.substring(0, c.val.length - 2);
              }
            }

            curLocal.value = c.val;

            if (topOfStack() !== curLocal) {
              topOfStack()?.addLocal(curLocal);
            } else {
              // This is probably an array, should we do anything about it?
            }
          }
          break;
        case streamType.name:
          {
            curLocal = new Local(c.val, "");
          }
          break;
        case streamType.leftBracket:
          {
            if (c.val === "") break;
            // Left Bracket
            localStack.push(curLocal);
          }
          break;
        case streamType.rightBracket:
          {
            // Right Bracket
            collapseTopOfStack();
          }
          break;
        case streamType.equals:
          {
            // Ignore the equals sign
          }
          break;
      }
    });

    return rootLocal;
  }

  /**
   * Parses a simple group value containing key-value pairs
   * @param name The name of the parent local variable
   * @param value The string containing simple key-value pairs
   * @returns A Local object containing the parsed key-value pairs
   */
  private parseSimpleValue(name: string, value: string): Local {
    const varsRegx = /[{, ](?<name>[^=]*) = (?<value>[^,]*)[,}]/gm;
    const vars = value.matchAll(varsRegx);
    const retValue: Local = new Local(name, "");

    for (const v of vars) {
      const newLocal: Local = new Local(v.groups?.name ?? "", v.groups?.value ?? "");
      retValue.sublocals.push(newLocal);
    }

    return retValue;
  }

  /**
   * Initializes the nameValMask array for tracking token types
   * Sets all positions to streamType.value initially
   * @param value The input string to create mask for
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
   * Updates the nameValMask array to mark positions of braces
   * @param chunk The input string to process
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
   * Updates the nameValMask array to mark positions of equals signs
   * @param chunk The input string to process
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
   * Updates the nameValMask array to mark positions of variable names
   * @param chunk The input string to process
   */
  private createNameValMask(chunk: string): void {
    const varsRegx = /(?<name>[a-zA-Z0-9_]*)(?<ign> = )/gm;
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
   * Determines the structural complexity of a value string
   * @param value The input string to analyze
   * @returns The appropriate valueType based on nesting depth
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
   * Removes the trailing quote and any excess characters from a value string
   * @param value The raw value string to clean
   * @returns The cleaned value string
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
const lc = new LocalsContainer("{}");
console.log(lc.locals);

// console.log("");
// console.log("");

// // Output the parsed structure in a readable JSON format
// console.log("Locals in a tree structure:");
// console.log(JSON.stringify(lc.locals, null, 2));
// console.log("");
