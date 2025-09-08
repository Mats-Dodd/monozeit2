// JSDOM doesn't implement canvas; stub it to avoid crashes from emoji detection
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => null,
})
