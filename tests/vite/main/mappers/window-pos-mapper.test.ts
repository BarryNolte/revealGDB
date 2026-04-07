import { describe, expect, it } from "vitest";
import { mapElectronWindowToWinPos } from "../../../../src/main/mappers/window-pos-mapper";

describe("mapElectronWindowToWinPos", () => {
  it("maps window coordinates and trims the size edges", () => {
    const result = mapElectronWindowToWinPos({
      getPosition: () => [25, 50],
      getSize: () => [640, 480],
      fullScreen: true,
    });

    expect(result).toEqual({
      x: 25,
      y: 50,
      width: 638,
      height: 478,
      fullscreen: true,
    });
  });
});
