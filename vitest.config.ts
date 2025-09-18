import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/__tests__/**/*.ts",
      "src/**/__tests__/**/*.tsx",
    ],
  },
})
