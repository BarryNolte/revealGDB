export type MemoryData = {
  begin: string;
  offset: string;
  end: string;
  data: Uint8Array;
};

/**
 * Parses a hex-encoded content string into a Uint8Array.
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
 * Maps regex named-capture groups from a GDB memory response
 * into a typed MemoryData object.
 */
export function mapRegexGroupsToMemoryData(groups: Record<string, string> | undefined): MemoryData {
  return {
    begin: groups?.begin ?? "",
    offset: groups?.offset ?? "",
    end: groups?.end ?? "",
    data: parseHexContents(groups?.contents ?? ""),
  };
}
