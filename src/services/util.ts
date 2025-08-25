export function assignDefined<T extends object>(
  target: T,
  patch: Partial<T>
): void {
  for (const key of Object.keys(patch) as Array<keyof T>) {
    const value = patch[key]
    if (value !== undefined) {
      target[key] = value as T[typeof key]
    }
  }
}
