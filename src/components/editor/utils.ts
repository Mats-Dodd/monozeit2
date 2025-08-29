import { LoroDoc } from "loro-crdt"

export function decodeBase64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function encodeUint8ToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

export function exportLoroSnapshotBase64(loroDoc: LoroDoc): string {
  const bytes = loroDoc.export({ mode: "snapshot" })
  return encodeUint8ToBase64(bytes)
}
