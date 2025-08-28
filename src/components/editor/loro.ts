import { useEffect, useRef } from "react"
import { LoroDoc } from "loro-crdt"
import { LoroSyncPlugin, LoroUndoPlugin } from "loro-prosemirror"
import { Extension } from "@tiptap/core"

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
): LoroDoc {
  const loroDocRef = useRef<LoroDoc | null>(null)
  const lastFileIdRef = useRef<string | null>(null)

  if (lastFileIdRef.current !== fileId || !loroDocRef.current) {
    const doc = new LoroDoc()
    if (base64Content) {
      try {
        const snapshot = decodeBase64ToUint8(base64Content)
        doc.import(snapshot)
      } catch (e) {
        console.warn("Loro import (sync) failed", e)
      }
    }
    loroDocRef.current = doc
    lastFileIdRef.current = fileId
  }

  useEffect(() => {
    if (!loroDocRef.current || !base64Content) return
    try {
      const snapshot = decodeBase64ToUint8(base64Content)
      loroDocRef.current.import(snapshot)
    } catch (e) {
      console.warn("Loro import failed", e)
    }
  }, [base64Content])

  return loroDocRef.current!
}

export function getLoroExtensions(loroDoc: LoroDoc) {
  return Extension.create({
    name: "loro",
    addProseMirrorPlugins() {
      return [
        LoroSyncPlugin({
          doc: loroDoc as unknown as Parameters<
            typeof LoroSyncPlugin
          >[0]["doc"],
        }),
        LoroUndoPlugin({
          doc: loroDoc as unknown as Parameters<
            typeof LoroUndoPlugin
          >[0]["doc"],
        }),
      ]
    },
  })
}

export function exportLoroSnapshotBase64(loroDoc: LoroDoc): string {
  const bytes = loroDoc.export({ mode: "snapshot" })
  return encodeUint8ToBase64(bytes)
}
