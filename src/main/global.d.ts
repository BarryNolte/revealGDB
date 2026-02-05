// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __REVEALGDB_DEBUG__: boolean;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __REVEALGDB_BUILD__: "debug" | "release";

declare global {
  var revealGdbBuild: {
    debug: boolean;
    mode: "debug" | "release";
  };
}

export {};
