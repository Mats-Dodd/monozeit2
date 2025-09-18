import { defineConfig } from "vitest/config"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tsconfigPaths from "vite-tsconfig-paths"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const plyrMock = path.resolve(__dirname, "src/test/mocks/plyr.ts")
const plyrDirMock = path.resolve(__dirname, "src/test/mocks/plyr/src/js")
const syfxStarterKitMock = path.resolve(
  __dirname,
  "src/test/mocks/syfxlin-starter-kit.ts"
)

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
  resolve: {
    alias: {
      // Stub plyr for tests; the starter kit references it transitively for media
      plyr: plyrMock,
      "plyr/src/js": plyrDirMock,
      "@syfxlin/tiptap-starter-kit": syfxStarterKitMock,
    },
  },
})
