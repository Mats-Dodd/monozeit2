import { LoroDoc } from "loro-crdt"

type RegistryEntry = {
  doc: LoroDoc
  refCount: number
  lastSavedBase64: string | null
  isApplyingRemote: boolean
}

const loroRegistry = new Map<string, RegistryEntry>()

export function acquireLoroDoc(key: string): LoroDoc {
  const existing = loroRegistry.get(key)
  if (existing) {
    existing.refCount += 1
    return existing.doc
  }
  const entry: RegistryEntry = {
    doc: new LoroDoc(),
    refCount: 1,
    lastSavedBase64: null,
    isApplyingRemote: false,
  }
  loroRegistry.set(key, entry)
  return entry.doc
}

export function releaseLoroDoc(key: string) {
  const existing = loroRegistry.get(key)
  if (!existing) return
  existing.refCount -= 1
  if (existing.refCount <= 0) {
    loroRegistry.delete(key)
  }
}

export function setLastSavedBase64(key: string, base64: string) {
  const entry = loroRegistry.get(key)
  if (!entry) return
  entry.lastSavedBase64 = base64
}

export function getLastSavedBase64(key: string): string | null {
  return loroRegistry.get(key)?.lastSavedBase64 ?? null
}

export function setIsApplyingRemote(key: string, value: boolean) {
  const entry = loroRegistry.get(key)
  if (!entry) return
  entry.isApplyingRemote = value
}

export function getIsApplyingRemote(key: string): boolean {
  return loroRegistry.get(key)?.isApplyingRemote ?? false
}
