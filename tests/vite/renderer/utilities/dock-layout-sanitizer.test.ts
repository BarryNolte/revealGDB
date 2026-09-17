/**
 * Dock Layout Sanitizer Tests
 *
 * Tests for dock layout dimension validation and correction
 */

import { describe, expect, it } from "vitest";
import { sanitizeDockLayout } from "../../../../src/renderer/utilities/dock-layout-sanitizer";

describe("sanitizeDockLayout", () => {
  it("should return non-object values unchanged", () => {
    expect(sanitizeDockLayout(null)).toBe(null);
    expect(sanitizeDockLayout(undefined)).toBe(undefined);
    expect(sanitizeDockLayout("string")).toBe("string");
    expect(sanitizeDockLayout(123)).toBe(123);
  });

  it("should correct negative height to minimum value", () => {
    const layout = {
      state: {
        height: -5,
        width: 100,
      },
    };

    const result = sanitizeDockLayout(layout);
    expect(result).toHaveProperty("state.height");
    expect((result as any).state.height).toBeGreaterThanOrEqual(20);
  });

  it("should correct negative width to minimum value", () => {
    const layout = {
      state: {
        width: -10,
        height: 100,
      },
    };

    const result = sanitizeDockLayout(layout);
    expect(result).toHaveProperty("state.width");
    expect((result as any).state.width).toBeGreaterThanOrEqual(20);
  });

  it("should preserve positive dimensions", () => {
    const layout = {
      state: {
        width: 890,
        height: 300,
      },
    };

    const result = sanitizeDockLayout(layout);
    expect((result as any).state.width).toBe(890);
    expect((result as any).state.height).toBe(300);
  });

  it("should sanitize nested children recursively", () => {
    const layout = {
      state: {
        width: 1000,
        height: 600,
      },
      children: [
        {
          state: {
            width: 500,
            height: -5,
          },
        },
        {
          state: {
            width: -10,
            height: 300,
          },
        },
      ],
    };

    const result = sanitizeDockLayout(layout) as any;
    expect(result.children[0].state.height).toBeGreaterThanOrEqual(20);
    expect(result.children[1].state.width).toBeGreaterThanOrEqual(20);
  });

  it("should handle deeply nested layouts", () => {
    const layout = {
      state: { width: 1000, height: 800 },
      children: [
        {
          state: { width: 500, height: -5 },
          children: [
            {
              state: { width: -10, height: 200 },
              children: [
                {
                  state: { width: 250, height: -3 },
                },
              ],
            },
          ],
        },
      ],
    };

    const result = sanitizeDockLayout(layout) as any;
    expect(result.children[0].state.height).toBeGreaterThanOrEqual(20);
    expect(result.children[0].children[0].state.width).toBeGreaterThanOrEqual(20);
    expect(result.children[0].children[0].children[0].state.height).toBeGreaterThanOrEqual(20);
  });

  it("should handle missing state object", () => {
    const layout = {
      children: [{ state: { width: 100, height: -5 } }],
    };

    const result = sanitizeDockLayout(layout);
    expect(result).toHaveProperty("children");
    expect((result as any).children[0].state.height).toBeGreaterThanOrEqual(20);
  });

  it("should handle real command window layout case", () => {
    const layout = {
      containerType: "panel",
      state: {
        element: "commandWindow",
        width: 890,
        height: -5,
        canUndock: true,
        hideCloseButton: true,
        panelType: "panel",
      },
      children: [],
    };

    const result = sanitizeDockLayout(layout) as any;
    expect(result.state.height).toBeGreaterThanOrEqual(20);
    expect(result.state.width).toBe(890);
    expect(result.state.element).toBe("commandWindow");
  });

  it("should not modify original layout object", () => {
    const originalLayout = {
      state: {
        width: 100,
        height: -5,
      },
    };

    const originalHeight = (originalLayout.state as any).height;
    sanitizeDockLayout(originalLayout);

    // Original should remain unchanged
    expect((originalLayout.state as any).height).toBe(originalHeight);
  });

  it("should correct zero dimensions to minimum value", () => {
    const layout = {
      state: {
        width: 0,
        height: 0,
      },
    };

    const result = sanitizeDockLayout(layout) as any;
    expect(result.state.width).toBeGreaterThanOrEqual(20);
    expect(result.state.height).toBeGreaterThanOrEqual(20);
  });
});
