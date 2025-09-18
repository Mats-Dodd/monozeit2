// JSDOM doesn't implement canvas; stub it to avoid crashes from emoji detection
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null,
})

// Stub plyr and its deep imports to avoid pulling browser-only internals in tests
import { vi } from "vitest"
vi.mock("plyr", () => ({
  default: class PlyrMock {
    destroy() {}
  },
}))
vi.mock("plyr/src/js/plyr.js", () => ({
  default: class PlyrMock {
    destroy() {}
  },
}))
vi.mock("plyr/src/js/captions", () => ({ default: {} }))
