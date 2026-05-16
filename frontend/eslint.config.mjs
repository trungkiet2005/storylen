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
    "next-env.d.ts",
    // Playwright build artifacts.
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    // Project-wide rule overrides — keep CI green without papering over real
    // bugs. `set-state-in-effect` is overly aggressive about the canonical
    // "hydrate from localStorage" pattern used in I18nContext, TopBar theme,
    // ResumeReading, etc., so we downgrade to a warning.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      // The React Compiler's purity checker is over-eager about Date.now() /
      // Math.random() inside async event handlers; the closures aren't
      // actually invoked during render. Treat as a warning.
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);

export default eslintConfig;
