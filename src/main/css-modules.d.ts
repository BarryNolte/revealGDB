/**
 * Implements css-modules.d for revealGDB.
 *
 * @remarks
 * Keep this module focused on one cohesive concern to reduce cross-layer coupling.
 */
// Ambient declaration so raw tsc can handle CSS side-effect imports
// that are pulled in transitively via renderer cross-boundary imports.
// At runtime, CSS imports are resolved by Vite/electron-vite.
declare module "*.css";
