// Shared lint rules for every package: typescript-eslint recommended for the
// TypeScript sources and tests, @eslint/js recommended for the plain scripts.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.wrangler/",
      "extension/public/",
      "worker/public/",
      // Built bundles (sources live in site/src, built by scripts/build-site.mjs).
      "site/mwa.js",
      "site/share.js",
      "site/share-tx.js",
      "site/wallets.js",
      "site/fonts/",
      "site/img/",
      "site/screenshots/",
      "design/applied/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Underscore-prefixed names mark parameters kept for a signature's shape.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Extension scripts run in pages, extension pages, and the service worker.
    files: ["extension/**/*.ts", "site/src/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker, chrome: "readonly" } },
  },
  {
    // The proxy Worker: service-worker style globals plus Node compatibility for Buffer.
    files: ["worker/**/*.ts"],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.node } },
  },
  {
    // Plain browser scripts on the landing site.
    files: ["site/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser } },
  },
  {
    // The site Worker is an ES module.
    files: ["site/worker.js"],
    languageOptions: { sourceType: "module", globals: { ...globals.serviceworker } },
  },
  {
    // Node tooling: build, packaging, and headless check scripts.
    files: ["scripts/**/*.{mjs,ts}", "design/tools/**/*.{mjs,js}", "extension/build.mjs", "eslint.config.js"],
    // `chrome` appears inside page.evaluate callbacks that run in the headless browser.
    languageOptions: { globals: { ...globals.node, ...globals.browser, chrome: "readonly" } },
  },
);
