import { defineConfig } from "vitest/config";

const buildVariant = process.env.REVEALGDB_BUILD === "debug" ? "debug" : "release";
const isDebugBuild =
  process.env.REVEALGDB_DEBUG === "true" ||
  (process.env.REVEALGDB_BUILD === undefined && process.env.NODE_ENV === "development");

const buildDefines = {
  __REVEALGDB_BUILD__: JSON.stringify(buildVariant),
  __REVEALGDB_DEBUG__: JSON.stringify(isDebugBuild),
};

export default defineConfig({
  define: buildDefines,
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
