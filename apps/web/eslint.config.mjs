import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "eslint.config.mjs",
    // Copied third-party PDF.js worker bundle:
    "public/pdf.worker.min.mjs",
  ]),
  {
    settings: {
      react: {
        version: "19.3",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Stock upstream shadcn/ui SidebarMenuSkeleton uses Math.random() inside useMemo;
    // keep upstream src/components/ui untouched so `shadcn add --overwrite` works cleanly.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
