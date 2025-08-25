export function assignDefined<T extends object>(
  target: T,
  patch: Partial<T>
): void {
  console.log("🔄 assignDefined:", { target, patch })
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key]
    console.log(
      `  ${String(key)}: ${value} (${typeof value}) - ${value !== undefined ? "ASSIGNING" : "SKIPPING"}`
    )
    if (value !== undefined) {
      target[key] = value as T[typeof key]
    }
  }
  console.log("🔄 assignDefined result:", target)
}
