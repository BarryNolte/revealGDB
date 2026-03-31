import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const buildVariant = process.env.REVEALGDB_BUILD === "debug" ? "debug" : "release";
const isDebugBuild =
  process.env.REVEALGDB_DEBUG === "true" ||
  (process.env.REVEALGDB_BUILD === undefined && process.env.NODE_ENV === "development");

const buildDefines = {
  __REVEALGDB_BUILD__: JSON.stringify(buildVariant),
  __REVEALGDB_DEBUG__: JSON.stringify(isDebugBuild),
};

export default defineConfig({
  plugins: [react()],
  define: buildDefines,
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/vite/**/*.test.ts", "tests/vite/**/*.spec.ts", "tests/vite/**/*.test.tsx", "tests/vite/**/*.spec.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
