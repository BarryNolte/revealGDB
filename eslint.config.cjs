/**
 * eslint.config module.
 *
 * @remarks
 * Source module for eslint.config.
 */

/**
 * @file eslint.config.cjs
 * @description Source module for eslint.config.
 */

const js = require("@eslint/js");
const tseslintPlugin = require("@typescript-eslint/eslint-plugin");
const tseslintParser = require("@typescript-eslint/parser");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const prettier = require("eslint-plugin-prettier");
const globals = require("globals");

const revealGdbBuildGlobals = {
  __REVEALGDB_DEBUG__: "readonly",
  __REVEALGDB_BUILD__: "readonly",
};

module.exports = [
  {
    ignores: ["node_modules/", "dist/", "build/"],
  },
  {
    files: ["src/renderer/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...revealGdbBuildGlobals,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
      react,
      "react-hooks": reactHooks,
      prettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslintPlugin.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...prettier.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "linebreak-style": ["error", "windows"],
      "no-async-promise-executor": 2,
      "no-await-in-loop": 2,
      "require-await": 2,
      "require-atomic-updates": 2,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/main/**/*.{ts,tsx,js,jsx}", "src/common/**/*.{ts,tsx,js,jsx}", "src/preload/**/*.{ts}"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...revealGdbBuildGlobals,
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
      prettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslintPlugin.configs.recommended.rules,
      ...prettier.configs.recommended.rules,
      "linebreak-style": ["error", "windows"],
      "no-async-promise-executor": 2,
      "no-await-in-loop": 2,
      "require-await": 2,
      "require-atomic-updates": 2,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["vite.config.ts"],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...revealGdbBuildGlobals,
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslintPlugin.configs.recommended.rules,
    },
  },
];
