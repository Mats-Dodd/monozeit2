import { fileCollection } from "@/lib/collections"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useCallback, useEffect, useRef } from "react"
import { LoroSyncPlugin, LoroUndoPlugin } from "loro-prosemirror"
import type { LoroDocType } from "loro-prosemirror"
import { Extension } from "@tiptap/core"
import { LoroDoc } from "loro-crdt"
import { decodeBase64ToUint8 } from "./utils"

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
) {
  const timeoutRef = useRef<number | null>(null)

  const debounced = useCallback(
    (...args: Args) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(...args)
      }, delayMs)
    },
    [callback, delayMs]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debounced
}

export function useGetCurrentFileContent(currentFileID: string) {
  const { data: currentFile } = useLiveQuery(
    (q) =>
      q.from({ c: fileCollection }).where(({ c }) => eq(c.id, currentFileID)),
    [currentFileID]
  )

  return currentFile?.[0]?.content
}

export function getLoroExtensions(loroDoc: LoroDoc) {
  return Extension.create({
    name: "loro",
    addProseMirrorPlugins() {
      return [
        LoroSyncPlugin({
          doc: loroDoc as LoroDocType,
        }),
        LoroUndoPlugin({ doc: loroDoc }),
      ]
    },
  })
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
