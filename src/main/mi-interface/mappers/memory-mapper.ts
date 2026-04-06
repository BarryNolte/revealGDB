/**
 * Implements memory mapper logic for processing GDB/MI output and debugger state transitions.
 *
 * @remarks
 * Exported symbols include `MemoryData`, `mapRegexGroupsToMemoryData`. It sits on the debugger data path that translates MI records into typed stores and notifications.
 */
export type MemoryData = {
  begin: string;
  offset: string;
  end: string;
  data: Uint8Array;
};

/**
 * Parses input into hex contents data.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param hexData - Value for `hexData` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
function parseHexContents(hexData: string): Uint8Array {
  const resultBytes: string[] = [];
  for (let i = 0; i < hexData.length; i += 2) {
    resultBytes.push(hexData.slice(i, i + 2));
  }
  const dataArray = new Uint8Array(resultBytes.length);
  resultBytes.forEach((byte, idx) => {
    dataArray[idx] = parseInt(byte, 16);
  });
  return dataArray;
}

/**
 * Maps source input into regex groups to memory data output.
 *
 * @remarks
 * Participates in the MI processing pipeline that updates debugger state and notifications.
 *
 * @param groups - Value for `groups` consumed by this operation.
 * @returns The computed result produced by this operation.
 */
export function mapRegexGroupsToMemoryData(groups: Record<string, string> | undefined): MemoryData {
  return {
    begin: groups?.begin ?? "",
    offset: groups?.offset ?? "",
    end: groups?.end ?? "",
    data: parseHexContents(groups?.contents ?? ""),
  };
}
