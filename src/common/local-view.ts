/**
 * Shared local variable view type for the preload/renderer layer.
 *
 * @remarks
 * Structural interface matching the `Local` class shape, safe to import from any layer.
 */

export interface ILocal {
  name: string;
  value: string;
  sublocals: ILocal[];
  fullpath: string;
}
