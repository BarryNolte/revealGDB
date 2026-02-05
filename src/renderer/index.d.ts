declare module "*.png";

declare const __REVEALGDB_DEBUG__: boolean;
declare const __REVEALGDB_BUILD__: "debug" | "release";

declare global {
  interface Window {
    revealGdbBuild: {
      debug: boolean;
      mode: "debug" | "release";
    };
  }
}
