module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  rules: {
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
};
