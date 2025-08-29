import { fileCollection } from "@/lib/collections"
import { eq, useLiveQuery } from "@tanstack/react-db"
import { useCallback, useEffect, useRef } from "react"
import { LoroSyncPlugin, LoroUndoPlugin } from "loro-prosemirror"
import type { LoroDocType } from "loro-prosemirror"
import { Extension } from "@tiptap/core"
import { LoroDoc } from "loro-crdt"

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
