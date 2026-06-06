import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These components setState inside an effect on purpose: to re-sync
      // local optimistic state when server props change, and to read the
      // clock / localStorage after mount for hydration safety. None are
      // render loops (each was reviewed). Next 16's react-compiler rule
      // flags the pattern, but the usage is correct, so we keep it off
      // rather than churn ~17 valid sync effects.
      "react-hooks/set-state-in-effect": "off",
      // Honour the underscore convention for intentionally-unused args
      // (e.g. a kept-for-signature parameter the body ignores).
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
    // The data layer casts Supabase query builders to `any` because the
    // generated client types don't model nested / renamed-fkey selects.
    // Scope the allowance to these two files instead of scattering
    // per-line disables through every query.
    files: ["lib/queries.ts", "lib/actions.ts", "lib/dashboard/actions.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
