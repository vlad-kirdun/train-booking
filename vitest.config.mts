import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resolves the `@/*` alias from tsconfig.json; native in Vite 7, which is why
  // the vite-tsconfig-paths plugin is not installed.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/app/**/{layout,loading,error,not-found}.tsx",
      ],
      // Business logic is held to full coverage: this is where a bug costs money.
      // Components are covered by critical-path tests instead — see CLAUDE.md.
      thresholds: {
        "src/domain/**/*.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        "src/lib/api/**/*.ts": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
