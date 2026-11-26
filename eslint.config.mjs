import eslintReact from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/dist", "docs"]),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        // Uses the nearest tsconfig.json (and its references) for each file;
        // root-level config files aren't in any project.
        projectService: { allowDefaultProject: ["*.mjs"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Browser code (React app + library source)
  {
    files: ["packages/*/src/**/*.{ts,tsx}"],
    extends: [
      eslintReact.configs["recommended-typescript"],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Node-side code: configs and offline scripts
  {
    files: [
      "*.{js,mjs,ts}",
      "packages/*/*.{js,mjs,ts}",
      "packages/*/scripts/**/*.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
