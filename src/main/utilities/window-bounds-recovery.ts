import type { Rectangle } from "../../common/settings-types";

export type DisplayBoundsLike = {
  bounds: Rectangle;
};

const DEFAULT_WINDOW_WIDTH = 1200;
const DEFAULT_WINDOW_HEIGHT = 800;

function intersects(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function isValidBounds(bounds: Rectangle | undefined): bounds is Rectangle {
  return !!bounds && bounds.width > 0 && bounds.height > 0;
}

export function hasVisibleBounds(
  bounds: Rectangle | undefined,
  displays: DisplayBoundsLike[],
): boolean {
  if (!isValidBounds(bounds)) {
    return false;
  }

  return displays.some((display) => intersects(bounds, display.bounds));
}

export function normalizeWindowBounds(
  bounds: Rectangle | undefined,
  displays: DisplayBoundsLike[],
  primaryDisplayBounds: Rectangle,
): Rectangle {
  if (hasVisibleBounds(bounds, displays)) {
    return bounds as Rectangle;
  }

  const width = Math.min(bounds?.width ?? DEFAULT_WINDOW_WIDTH, primaryDisplayBounds.width);
  const height = Math.min(bounds?.height ?? DEFAULT_WINDOW_HEIGHT, primaryDisplayBounds.height);

  return {
    x: primaryDisplayBounds.x + Math.floor((primaryDisplayBounds.width - width) / 2),
    y: primaryDisplayBounds.y + Math.floor((primaryDisplayBounds.height - height) / 2),
    width,
    height,
  };
}
