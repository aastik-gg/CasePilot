import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()], // resolves the "@/*" alias in tests
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "eval/**/*.test.ts"],
    testTimeout: 120_000, // LLM eval calls are slow
    hookTimeout: 120_000,
  },
});
