import { useCallback } from "react"
import { LoroSyncPlugin, LoroUndoPlugin } from "loro-prosemirror"
import type { LoroDocType } from "loro-prosemirror"
import { Extension } from "@tiptap/core"
import { LoroDoc } from "loro-crdt"

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number
) {
  let timeout: number | null = null
  return useCallback(
    (...args: Args) => {
      if (timeout !== null) {
        window.clearTimeout(timeout)
      }
      timeout = window.setTimeout(() => {
        callback(...args)
      }, delayMs)
    },
    [callback, delayMs]
  )
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

// legacy hooks removed in favor of useBranchDoc
