/**
 * Verifies toolbar layout CSS contracts to prevent height/alignment regressions.
 */
// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function getRuleBody(cssText: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const match = cssText.match(rule);
  return match?.[1] ?? "";
}

describe("Toolbar layout regression", () => {
  it("keeps toolbar height and horizontal alignment contracts", () => {
    const cssPath = fileURLToPath(
      new URL("../../../../src/renderer/Components/Toolbar.css", import.meta.url),
    );
    const cssText = readFileSync(cssPath, "utf-8");

    const rootRule = getRuleBody(cssText, ".toolbar-root");
    expect(rootRule).toContain("display: flex");
    expect(rootRule).toContain("flex: 0 0 auto");
    expect(rootRule).toContain("width: 100%");
    expect(rootRule).toContain("min-height: 42px");

    const mainRule = getRuleBody(cssText, ".toolbar-main");
    expect(mainRule).toContain("flex: 1 1 auto");
    expect(mainRule).toContain("min-width: 0");

    const windowMenuRule = getRuleBody(cssText, ".toolbar-window-menu");
    expect(windowMenuRule).toContain("flex: 0 0 auto");
  });
});
