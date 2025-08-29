import { useEffect, useRef } from "react"
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

export function useLoroDocForFile(
  fileId: string,
  base64Content: string | null
): { loroDoc: LoroDoc; markSnapshotApplied: (base64: string) => void } {
  const loroDocRef = useRef<LoroDoc | null>(null)
  const lastFileIdRef = useRef<string | null>(null)
  const lastImportedBase64Ref = useRef<string | null>(null)

  if (lastFileIdRef.current !== fileId || !loroDocRef.current) {
    const doc = new LoroDoc()
    if (base64Content) {
      try {
        const snapshot = decodeBase64ToUint8(base64Content)
        doc.import(snapshot)
        lastImportedBase64Ref.current = base64Content
      } catch (e) {
        console.warn("Loro import (sync) failed", e)
      }
    } else {
      lastImportedBase64Ref.current = null
    }
    loroDocRef.current = doc
    lastFileIdRef.current = fileId
  }

  useEffect(() => {
    if (!loroDocRef.current || !base64Content) return
    if (lastImportedBase64Ref.current === base64Content) return
    try {
      const snapshot = decodeBase64ToUint8(base64Content)
      loroDocRef.current.import(snapshot)
      lastImportedBase64Ref.current = base64Content
    } catch (e) {
      console.warn("Loro import failed", e)
    }
  }, [base64Content])

  const markSnapshotApplied = (base64: string) => {
    lastImportedBase64Ref.current = base64
  }

  return { loroDoc: loroDocRef.current!, markSnapshotApplied }
}

export function exportLoroSnapshotBase64(loroDoc: LoroDoc): string {
  const bytes = loroDoc.export({ mode: "snapshot" })
  return encodeUint8ToBase64(bytes)
}
